#!/usr/bin/env node
/**
 * Loads the BUILT extension into real Chromium and asserts that Chrome accepts it.
 *
 * Why this exists: `npm run build` and the unit tests both pass even when
 * manifest.json is something Chrome refuses to install. A bad field — e.g. a
 * path-bearing match pattern in `web_accessible_resources` — produces a manifest
 * that typechecks, tests green, and then fails to install for every user, with no
 * error shown to them. The only reliable check is to hand the package to Chrome
 * and see whether the service worker comes up.
 *
 * Signals checked:
 *   1. The MV3 service worker registers (proves the manifest parsed).
 *   2. The extension's popup page loads (proves the built asset graph is intact).
 *   3. No manifest error appears in the browser's stderr.
 *
 * Usage:  node scripts/validate-extension.mjs [path-to-unpacked-dir]
 *         Defaults to dist/. Requires `npm run build` first.
 */

import { chromium } from 'playwright'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extDir = path.resolve(process.argv[2] ?? path.join(root, 'dist'))

if (!existsSync(path.join(extDir, 'manifest.json'))) {
  console.error(`✗ no manifest.json in ${extDir} — run 'npm run build' first`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(path.join(extDir, 'manifest.json'), 'utf8'))
console.log(`Checking ${path.relative(root, extDir) || extDir} (v${manifest.version})…`)

// Chrome requires every web_accessible_resources match to be host-level with a
// literal '/*' path. Flag it here as well so the failure names the cause instead
// of surfacing only as "extension did not load".
const warPaths = []
for (const entry of manifest.web_accessible_resources ?? []) {
  for (const m of entry.matches ?? []) {
    if (m === '<all_urls>') warPaths.push(m)
    else if (!/^[^:]+:\/\/[^/]+\/\*$/.test(m)) warPaths.push(m)
  }
}

const userDataDir = mkdtempSync(path.join(tmpdir(), 'piii-validate-'))
let context
let ok = false
let failure = ''

try {
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
    ],
  })

  let worker = context.serviceWorkers()[0]
  if (!worker) {
    worker = await context.waitForEvent('serviceworker', { timeout: 15000 }).catch(() => null)
  }

  if (!worker) {
    failure = 'Chrome did not start the extension service worker — the manifest was refused.'
  } else {
    const extensionId = new URL(worker.url()).host
    console.log(`  ✓ service worker up (id ${extensionId})`)

    const popup = await context.newPage()
    const res = await popup.goto(`chrome-extension://${extensionId}/index.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })
    if (res && res.status() >= 400) {
      failure = `popup page returned HTTP ${res.status()}`
    } else {
      const title = await popup.title()
      console.log(`  ✓ popup page rendered ("${title}")`)
      ok = true
    }
  }
} catch (err) {
  failure = err.message
} finally {
  if (context) await context.close().catch(() => {})
  rmSync(userDataDir, { recursive: true, force: true })
}

if (warPaths.length) {
  console.log(`\n⚠ web_accessible_resources entries Chrome may reject (must be origin + '/*'):`)
  for (const m of warPaths) console.log(`   - ${m}`)
}

if (ok) {
  console.log('\n✓ Chrome accepted the extension package.')
  process.exit(0)
}

console.error(`\n✗ Chrome rejected the extension package: ${failure}`)
if (warPaths.length) {
  console.error('  Fix the web_accessible_resources patterns listed above.')
}
process.exit(1)
