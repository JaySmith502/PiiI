import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, defineManifest } from '@crxjs/vite-plugin'
import { copyFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'

// Single source of truth for the version: package.json. The manifest and the
// onboarding page footer both read it, so a release bump happens in one place.
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')) as { version: string }

// Prevents Vite from treating new URL("*.wasm", import.meta.url) as a bundled asset
// (which would copy giant WASM binaries into dist/). The string replacement is dead
// code at runtime since wasmPaths overrides all path resolution.
const ONNX_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'

function ortBuildPlugin(): Plugin {
  return {
    name: 'ort-build',

    // 0. Refresh the PDF.js worker into public/ from the installed package so
    //    its version always matches the bundled API. Runs at buildStart so the
    //    file exists when @crxjs resolves web_accessible_resources. A stale
    //    hand-copied worker causes "API version X does not match Worker
    //    version Y" and PDF scanning silently fails.
    buildStart() {
      const pub = join(__dirname, 'public')
      mkdirSync(pub, { recursive: true })
      copyFileSync(
        join(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
        join(pub, 'pdf.worker.min.mjs'),
      )
    },

    // 1. Prevent Vite from copying WASM assets via new URL() patterns.
    //    Also patch SharedArrayBuffer checks so ort-web stays single-threaded
    //    (belt-and-suspenders alongside the wasmPaths local-file approach).
    transform(code, id) {
      if (!id.includes('onnxruntime') && !id.includes('transformers')) return null
      let result = code
      result = result.replace(
        /new URL\(["']([^"']*\.wasm)["'],\s*import\.meta\.url\)(?:\.href)?/g,
        (_match, wasmFile) => `"${ONNX_CDN}${wasmFile.split('/').pop()}"`,
      )
      result = result
        .replace(/typeof SharedArrayBuffer\s*<\s*"u"/g, 'false')
        .replace(/typeof SharedArrayBuffer\s*>\s*"u"/g, 'true')
      if (result === code) return null
      return { code: result, map: null }
    },

    // 2. Copy the ort-wasm runtime files from node_modules into dist/ort-wasm/
    //    so the offscreen document can import() them locally (satisfying CSP script-src 'self').
    //    The .mjs is 46 KB; the .wasm binary is 23 MB — both match the exact version
    //    embedded in @huggingface/transformers so there is no API mismatch.
    writeBundle() {
      const src = join(__dirname, 'node_modules/onnxruntime-web/dist')
      const dest = join(__dirname, 'dist/ort-wasm')
      mkdirSync(dest, { recursive: true })
      for (const f of ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']) {
        copyFileSync(join(src, f), join(dest, f))
      }
    },
  }
}

// The chat surfaces PiiI supports. Single source of truth: the content script
// injects on exactly these, and the bundled PDF worker is exposed to exactly
// these (see web_accessible_resources) — nothing broader.
const SITE_MATCHES = [
  'https://chat.openai.com/*',
  'https://chatgpt.com/*',
  'https://claude.ai/*',
  'https://gemini.google.com/*',
  'https://copilot.microsoft.com/*',
  'https://grok.com/*',
  'https://x.com/i/grok*',
  'https://www.perplexity.ai/*',
  'https://chat.deepseek.com/*',
]

// web_accessible_resources does NOT accept the full match-pattern grammar the
// content script uses: Chrome requires every entry to be host-level, with a
// literal '/*' path. A path-bearing pattern such as 'https://x.com/i/grok*' is
// valid for content_scripts but makes Chrome reject the ENTIRE manifest with
// "Invalid value for 'web_accessible_resources[0]'. Invalid match pattern." —
// the extension then fails to install, with no visible error to the user.
// So the WAR list is derived from SITE_MATCHES by collapsing each pattern to its
// origin. This cannot widen what the extension can *read*: WAR only controls
// which pages may load the listed files, it grants no host access.
const WAR_MATCHES = [
  ...new Set(SITE_MATCHES.map((pattern) => `${new URL(pattern).origin}/*`)),
]

const manifest = defineManifest({
  manifest_version: 3,
  name: 'PiiI',
  version: pkg.version,
  description: 'Open-source AI data-loss prevention — detects and masks PII before it leaves your browser.',
  // Store listing + support link for customers, and the oldest Chrome whose APIs
  // PiiI actually relies on (chrome.runtime.getContexts landed in 116; the
  // offscreen document and MV3 service-worker behaviour are stable from 120).
  homepage_url: 'https://github.com/JaySmith502/PiiI',
  minimum_chrome_version: '120',
  // Every permission here is justified to the user on the onboarding page.
  // Deliberately absent: tabs, webRequest, scripting, host_permissions — PiiI
  // only ever touches the chat domains matched by its content script.
  permissions: ['storage', 'contextMenus', 'activeTab', 'alarms', 'offscreen'],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
  action: {
    default_popup: 'index.html',
    default_title: 'PiiI — review before send',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  commands: {
    'allow-selection': {
      // Alt+Shift+A: avoids the DevTools triad (Ctrl+Shift+I/J, Cmd+Opt+I) and
      // Firefox's Ctrl+Shift+K. On macOS the browser intercepts the registered
      // command before the page, so Option+Shift+A does NOT insert a glyph in
      // the composer. Users can rebind at chrome://extensions/shortcuts.
      suggested_key: { default: 'Alt+Shift+A' },
      description: 'Always allow the selected term (skip redaction)',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: SITE_MATCHES,
      js: ['src/content/index.tsx'],
    },
  ],
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
    '256': 'icons/icon256.png',
  },
  web_accessible_resources: [
    {
      // Loaded by the content script (chrome.runtime.getURL) when scanning a PDF
      // attachment, so it only needs to be reachable from the supported chat
      // sites. '<all_urls>' here would let any page on the web probe the bundle.
      // WAR_MATCHES, not SITE_MATCHES — see the note above.
      resources: ['pdf.worker.min.mjs'],
      matches: WAR_MATCHES,
    },
  ],
})

export default defineConfig({
  plugins: [
    ortBuildPlugin(),
    react(),
    crx({ manifest }),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      external: [/\.wasm$/],
      // offscreen.html: the hidden ML page. welcome.html: onboarding, opened in a
      // tab once after install by the service worker.
      input: { offscreen: 'offscreen.html', welcome: 'welcome.html' },
    },
  },
})
