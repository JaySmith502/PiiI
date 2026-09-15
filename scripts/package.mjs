#!/usr/bin/env node
// Builds the Chrome Web Store upload archive from dist/.
//
// The store requires manifest.json at the ROOT of the zip (a nested dist/ folder
// is rejected), so the archive is created with dist/ as the working directory and
// written out to release/. Run via `npm run package`, which builds first.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const manifestPath = join(dist, 'manifest.json')

if (!existsSync(manifestPath)) {
  console.error('✗ dist/manifest.json not found. Run `npm run build` first.')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

// Cloudflare-grade sanity checks: a broken package should fail here, not in the
// store review a week later.
const required = ['icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png', 'offscreen.html', 'welcome.html']
const missing = required.filter(f => !existsSync(join(dist, f)))
if (missing.length > 0) {
  console.error(`✗ dist/ is incomplete, missing: ${missing.join(', ')}`)
  process.exit(1)
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  console.error(`✗ manifest version "${manifest.version}" is not a plain x.y.z — the store rejects it.`)
  process.exit(1)
}

const outDir = join(root, 'release')
mkdirSync(outDir, { recursive: true })
const zipPath = join(outDir, `piii-${manifest.version}.zip`)
rmSync(zipPath, { force: true })

try {
  execFileSync('zip', ['-r', '-q', zipPath, '.', '-x', '*.DS_Store', '-x', '**/.DS_Store'], {
    cwd: dist,
    stdio: 'inherit',
  })
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('✗ the `zip` command is not available. Install it (macOS/Linux: usually preinstalled) and retry.')
    process.exit(1)
  }
  throw err
}

const kb = (statSync(zipPath).size / 1024).toFixed(0)
console.log(`✓ ${zipPath.replace(root + '/', '')} — PiiI v${manifest.version}, ${kb} KB`)
console.log('  Upload this file at https://chrome.google.com/webstore/devconsole (manifest.json is at the archive root).')
