import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, defineManifest } from '@crxjs/vite-plugin'
import { copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'

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

const manifest = defineManifest({
  manifest_version: 3,
  name: 'PiiI',
  version: '0.1.0',
  description: 'Open-source AI data-loss prevention — detects and masks PII before it leaves your browser.',
  permissions: ['storage', 'contextMenus', 'activeTab', 'alarms', 'offscreen'],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
  action: {
    default_popup: 'index.html',
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
      matches: [
        'https://chat.openai.com/*',
        'https://chatgpt.com/*',
        'https://claude.ai/*',
        'https://gemini.google.com/*',
        'https://copilot.microsoft.com/*',
        'https://grok.com/*',
        'https://x.com/i/grok*',
        'https://www.perplexity.ai/*',
        'https://chat.deepseek.com/*',
      ],
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
      resources: ['pdf.worker.min.mjs'],
      matches: ['<all_urls>'],
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
      input: { offscreen: 'offscreen.html' },
    },
  },
})
