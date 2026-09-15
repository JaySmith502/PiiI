#!/usr/bin/env node
/**
 * Captures the Chrome Web Store screenshot set for PiiI.
 *
 * Loads the BUILT extension (dist/) into a real Chromium profile, drives the
 * genuine content script against a locally-served stand-in for a chat composer,
 * and writes 1280x800 PNGs into store/screenshots/.
 *
 * Why a local stand-in rather than the real chatgpt.com: the store screenshot
 * must not require an account, a live session, or a network round-trip, and it
 * must be reproducible. What is NOT faked is the interesting part — the content
 * script, the regex detectors, the highlight overlay, the review panel and the
 * popup are the shipped code, loaded from the shipped bundle. Only the host page
 * markup is a fixture, because the host page is not ours.
 *
 * The Hugging Face CDN is blocked for the duration so the ~296 MB model fetch
 * does not run during capture; pattern-rule detection (email / phone / card /
 * SSN / URL) is synchronous and needs no model, so the panel is fully populated
 * without it. Name and address rows would additionally appear once the model is
 * cached — see store/SUBMISSION.md.
 *
 * Usage:  node scripts/screenshots.mjs
 *   Requires `npm run build` first (reads dist/).
 */

import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = path.join(ROOT, 'dist')
const OUT = path.join(ROOT, 'store', 'screenshots')
const PROFILE = path.join(tmpdir(), 'piii-screenshot-profile')

const W = 1280
const H = 800

// The reviewer test message from store/SUBMISSION.md, trimmed to the categories
// the pattern rules catch synchronously.
const PROMPT =
  'Hi - can you help me draft a reply? The customer is John Smith, reachable at ' +
  'john.smith@example.com or on (555) 867-5309. The card on file is ' +
  '4111 1111 1111 1111, SSN 123-45-6789, and their profile lives at ' +
  'https://internal.example.com/customers/4471.'

// ---------------------------------------------------------------------------
// Fixture: a plausible chat page. Only structure matters — the extension keys
// off #prompt-textarea and button[data-testid="send-button"] (see
// src/content/adapters/chatgpt.ts and DEFAULT_SEND_BUTTON in src/content/submit.ts).
// ---------------------------------------------------------------------------

const CHAT_FIXTURE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ChatGPT</title><style>
*{box-sizing:border-box}
html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#0d0d0d;-webkit-font-smoothing:antialiased}
.app{display:flex;height:100vh}
.sidebar{width:260px;flex:none;background:#f9f9f9;border-right:1px solid #ececec;padding:12px;display:flex;flex-direction:column;gap:1px}
.brand{display:flex;align-items:center;gap:9px;padding:8px 10px;font-weight:600;font-size:14px;margin-bottom:10px}
.dot{width:21px;height:21px;border-radius:50%;background:#0d0d0d}
.nav{padding:8px 10px;border-radius:8px;font-size:13px;color:#3c3c3c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav.active{background:#ececec}
.side-label{font-size:11px;color:#8e8e8e;padding:16px 10px 6px;font-weight:600}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.topbar{height:54px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #ececec}
.model{font-size:14px;font-weight:600;color:#3c3c3c}
.thread{flex:1;overflow:hidden;padding:26px 0 6px}
.msg{max-width:768px;margin:0 auto 24px;padding:0 24px;font-size:15px;line-height:1.7}
.msg.user{display:flex;justify-content:flex-end;padding:0 24px}
.bubble{background:#f4f4f4;border-radius:18px;padding:10px 16px;max-width:520px;font-size:15px;line-height:1.55}
.composer-wrap{padding:0 24px 20px;flex:none}
.composer{max-width:768px;margin:0 auto;border:1px solid #d9d9d9;border-radius:26px;padding:15px 16px 12px;display:flex;align-items:flex-end;gap:10px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
#prompt-textarea{flex:1;min-height:118px;max-height:240px;overflow-y:auto;outline:none;font-size:15px;line-height:1.62;white-space:pre-wrap;word-break:break-word}
#prompt-textarea:empty:before{content:attr(data-placeholder);color:#8e8e8e}
.send{width:34px;height:34px;flex:none;border-radius:50%;border:none;background:#0d0d0d;color:#fff;font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center}
.hint{max-width:768px;margin:9px auto 0;text-align:center;font-size:11.5px;color:#8e8e8e}
</style></head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand"><span class="dot"></span>ChatGPT</div>
    <div class="nav active">New chat</div>
    <div class="nav">Search chats</div>
    <div class="side-label">Today</div>
    <div class="nav">Refund policy for order #4471</div>
    <div class="nav">Migrating the billing webhook</div>
    <div class="side-label">Yesterday</div>
    <div class="nav">Summarise the Q3 contract</div>
    <div class="side-label">Previous 7 days</div>
    <div class="nav">Onboarding email sequence</div>
  </aside>
  <main class="main">
    <div class="topbar"><div class="model">ChatGPT</div><div class="nav" style="font-size:13px">Share</div></div>
    <div class="thread">
      <div class="msg user"><div class="bubble">Can you draft a reply to this customer?</div></div>
      <div class="msg">Sure, paste the message here and I&rsquo;ll draft a response you can send.</div>
    </div>
    <div class="composer-wrap">
      <div class="composer">
        <div id="prompt-textarea" contenteditable="true" data-placeholder="Message ChatGPT"></div>
        <button class="send" data-testid="send-button" aria-label="Send prompt">&#8593;</button>
      </div>
      <div class="hint">ChatGPT can make mistakes. Check important info.</div>
    </div>
  </main>
</div>
</body></html>`

// ---------------------------------------------------------------------------
// Realistic popup data. Seeds chrome.storage.local so the audit log and alias
// table are populated — an empty-state popup is accurate on first run but tells
// a buyer nothing. Shapes match AuditEntry in src/types/index.ts.
// ---------------------------------------------------------------------------

function seedAudit() {
  const at = (minsAgo) => new Date(Date.now() - minsAgo * 60_000).toISOString()
  return [
    { timestamp: at(6), platform: 'chatgpt', classesDetected: ['email', 'phone', 'credit_card'], action: 'accepted', aliasCount: 3 },
    { timestamp: at(52), platform: 'claude', classesDetected: ['ssn', 'account_id'], action: 'accepted', aliasCount: 2 },
    { timestamp: at(96), platform: 'chatgpt', classesDetected: ['person', 'email', 'address'], action: 'edited', aliasCount: 3 },
    { timestamp: at(184), platform: 'gemini', classesDetected: ['api_key', 'url'], action: 'accepted', aliasCount: 2 },
    { timestamp: at(301), platform: 'chatgpt', classesDetected: ['phone', 'date'], action: 'sent_original', aliasCount: 0 },
    { timestamp: at(455), platform: 'perplexity', classesDetected: ['person', 'address'], action: 'accepted', aliasCount: 2 },
  ]
}

// ---------------------------------------------------------------------------
// Composition frame — the popup is 340px wide, so a bare capture would be a
// small panel in a large empty canvas. This places it on a branded backdrop at
// the required 1280x800, using the extension's own bundled webfonts.
// ---------------------------------------------------------------------------

function brandFontCss() {
  const faces = [
    ['Jost', '800 900', 'jost-latin.woff2'],
    ['Archivo', '400 900', 'archivo-latin.woff2'],
    ['JetBrains Mono', '400 700', 'jetbrainsmono-latin.woff2'],
  ]
  return faces
    .map(([family, weight, file]) => {
      const b64 = readFileSync(path.join(DIST, 'fonts', file)).toString('base64')
      return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`
    })
    .join('\n')
}

function frameHtml({ popupB64, title, subtitle, points }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${brandFontCss()}
*{box-sizing:border-box}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
body{
  font-family:'Archivo',system-ui,-apple-system,sans-serif;
  background:
    radial-gradient(1200px 620px at 78% -12%, #D6EAF8 0%, rgba(214,234,248,0) 62%),
    radial-gradient(900px 520px at 4% 108%, #FFF1C2 0%, rgba(255,241,194,0) 60%),
    #FAF9F4;
  color:#141414;display:flex;align-items:center;gap:64px;padding:0 76px;
}
.copy{flex:1;min-width:0}
.kicker{font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#6E6E6E;margin:0 0 18px}
h1{font-family:'Jost',sans-serif;font-weight:900;font-size:52px;line-height:1.02;letter-spacing:-.02em;margin:0 0 18px}
.rule{width:76px;height:6px;background:#1B81CE;margin:0 0 20px}
p.sub{font-size:17px;line-height:1.62;color:#353535;margin:0 0 26px;max-width:36ch}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px}
li{display:flex;align-items:flex-start;gap:11px;font-size:14.5px;color:#525252;line-height:1.45}
.tick{width:19px;height:19px;flex:none;border-radius:4px;background:#1F9D55;color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700;margin-top:1px}
.panel-wrap{flex:none;position:relative}
.panel-wrap:before{content:'';position:absolute;inset:14px -14px -14px 14px;background:#141414;border-radius:12px}
.shot{position:relative;display:block;border:2px solid #141414;border-radius:12px;box-shadow:0 18px 44px rgba(20,20,20,.16)}
</style></head>
<body>
  <div class="copy">
    <p class="kicker">PiiI &middot; browser extension</p>
    <h1>${title}</h1>
    <div class="rule"></div>
    <p class="sub">${subtitle}</p>
    <ul>${points.map((t) => `<li><span class="tick">&#10003;</span><span>${t}</span></li>`).join('')}</ul>
  </div>
  <div class="panel-wrap"><img class="shot" src="data:image/png;base64,${popupB64}" alt="PiiI popup"></div>
</body></html>`
}

// ---------------------------------------------------------------------------

/** Guards against shipping a blank/black/mis-sized capture as a store asset. */
async function verifyShot(probe, file) {
  const b64 = readFileSync(file).toString('base64')
  const stats = await probe.evaluate(async (dataUri) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + dataUri
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const seen = new Set()
    let lum = 0
    let n = 0
    for (let i = 0; i < data.length; i += 4 * 29) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      seen.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3))
      lum += 0.299 * r + 0.587 * g + 0.114 * b
      n++
    }
    return { w: c.width, h: c.height, colors: seen.size, meanLum: +(lum / n).toFixed(1) }
  }, b64)

  const problems = []
  if (stats.w !== W || stats.h !== H) problems.push(`size ${stats.w}x${stats.h}, expected ${W}x${H}`)
  if (stats.colors < 40) problems.push(`only ${stats.colors} distinct colours - looks blank`)
  if (stats.meanLum < 8) problems.push(`mean luminance ${stats.meanLum} - looks black`)
  const verdict = problems.length ? `FAIL (${problems.join('; ')})` : 'ok'
  console.log(`  ${path.basename(file).padEnd(30)} ${stats.w}x${stats.h}  colors=${String(stats.colors).padStart(5)}  lum=${String(stats.meanLum).padStart(5)}  ${verdict}`)
  return problems.length === 0
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  rmSync(PROFILE, { recursive: true, force: true })

  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chromium',
    headless: true,
    viewport: { width: W, height: H },
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=DialMediaRouteProvider',
    ],
  })

  const results = []

  try {
    // Resolve the extension id from its service worker — the id is derived from
    // the unpacked path, so it is stable for this checkout but must be read.
    let sw = context.serviceWorkers()[0]
    if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 30_000 })
    const extId = new URL(sw.url()).host
    console.log(`extension id: ${extId}`)

    // Keep the 296 MB model off the wire during capture.
    await context.route('**://huggingface.co/**', (r) => r.abort())
    await context.route('**://cdn-lfs.huggingface.co/**', (r) => r.abort())
    await context.route('**://hf.co/**', (r) => r.abort())

    const probe = await context.newPage()
    await probe.goto('about:blank')

    // -- Seed storage so the popup shows a populated audit log ----------------
    const popup = await context.newPage()
    await popup.goto(`chrome-extension://${extId}/index.html`)
    await popup.evaluate(
      ([audit, whitelist, settings]) =>
        new Promise((res) => {
          chrome.storage.local.set(
            { 'piiii:audit': audit, 'piiii:whitelist': whitelist, 'piiii:settings': settings },
            res,
          )
        }),
      [
        seedAudit(),
        [{ term: 'Acme Corp', addedAt: new Date(Date.now() - 3600_000).toISOString() }],
        { enabled: true },
      ],
    )
    await popup.reload()
    await popup.waitForTimeout(700)

    // -- 1. Highlights in the composer (pre-send) ----------------------------
    const chat = await context.newPage()
    await chat.route('https://chatgpt.com/**', (r) =>
      r.fulfill({ contentType: 'text/html', body: CHAT_FIXTURE }),
    )
    await chat.goto('https://chatgpt.com/')
    const composer = chat.locator('#prompt-textarea')
    await composer.waitFor({ state: 'visible', timeout: 15_000 })
    await composer.click()
    // Type rather than fill: the content script listens for keyup, and a real
    // keystroke stream is what the overlay positions itself against.
    await composer.pressSequentially(PROMPT, { delay: 2 })
    await composer.dispatchEvent('keyup')
    await chat.waitForTimeout(1400) // debounce (300ms) + overlay layout

    const overlayBox = await chat
      .locator('div[data-piiii-overlay]')
      .boundingBox()
      .catch(() => null)
    console.log(
      `overlay mounted: ${overlayBox ? `${Math.round(overlayBox.width)}x${Math.round(overlayBox.height)}` : 'NO'}`,
    )

    const shot1 = path.join(OUT, '01-detections-in-composer.png')
    await chat.screenshot({ path: shot1 })
    results.push(shot1)

    // -- 2. Review panel (post-send) -----------------------------------------
    // A real click on the send control, so the document-capture interceptor in
    // src/content/submit.ts is genuinely exercised rather than called directly.
    await chat.locator('button[data-testid="send-button"]').click()
    // Wait on the dialog card, not the wrapper. The wrapper is a bare <div> whose
    // only child is position:fixed, so the wrapper itself measures 0px high and
    // Playwright never reports it as "visible" — even though the panel is plainly
    // on screen. The dialog is the element that actually has layout.
    const panel = chat.locator('div[data-piiii-review] div[role="dialog"]')
    await panel.waitFor({ state: 'visible', timeout: 15_000 })
    await chat.waitForTimeout(600)

    const rows = await panel.locator('input[data-alias-input="true"]').count()
    console.log(`review panel rows: ${rows}`)
    if (rows < 3) throw new Error(`expected >=3 detection rows in the panel, got ${rows}`)

    const shot2 = path.join(OUT, '02-review-panel.png')
    await chat.screenshot({ path: shot2 })
    results.push(shot2)

    // -- 3. Popup -------------------------------------------------------------
    const rootBox = await popup.evaluate(() => {
      const el = document.querySelector('#root > *')
      const rect = el.getBoundingClientRect()
      return { w: Math.ceil(rect.width), h: Math.ceil(rect.height) }
    })
    await popup.setViewportSize({ width: rootBox.w, height: rootBox.h })
    await popup.waitForTimeout(300)
    const popupShot = path.join(OUT, '_popup-raw.png')
    await popup.screenshot({ path: popupShot })

    const frame = await context.newPage()
    await frame.setViewportSize({ width: W, height: H })
    await frame.setContent(
      frameHtml({
        popupB64: readFileSync(popupShot).toString('base64'),
        title: 'Review every<br>value before<br>it leaves.',
        subtitle:
          'PiiI catches personal data on the way out of your AI chat and shows you exactly what it found - before you hit send.',
        points: [
          'Names, emails, phones, cards, SSNs, keys and IDs',
          'On-device detection - no backend, no account, no telemetry',
          'Names stay readable in replies via a local alias map',
          'Audit log of categories and counts, never the values',
        ],
      }),
    )
    await frame.waitForTimeout(400)
    const shot3 = path.join(OUT, '03-popup-audit-log.png')
    await frame.screenshot({ path: shot3 })
    results.push(shot3)
    rmSync(popupShot, { force: true })

    // -- 4. Welcome / onboarding ---------------------------------------------
    const welcome = await context.newPage()
    await welcome.setViewportSize({ width: W, height: H })
    await welcome.goto(`chrome-extension://${extId}/welcome.html`)
    await welcome.waitForTimeout(600)
    const shot4 = path.join(OUT, '04-welcome.png')
    await welcome.screenshot({ path: shot4 })
    results.push(shot4)
  } finally {
    await context.close()
    rmSync(PROFILE, { recursive: true, force: true })
  }

  console.log('\nverifying captures:')
  const checks = []
  const probeCtx = await chromium.launch({ headless: true })
  try {
    const page = await probeCtx.newPage()
    await page.goto('about:blank')
    for (const f of results) checks.push(await verifyShot(page, f))
  } finally {
    await probeCtx.close()
  }

  console.log(`\nwrote ${results.length} screenshot(s) to ${path.relative(ROOT, OUT)}/`)
  if (checks.some((c) => !c)) {
    console.error('one or more captures failed verification')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
