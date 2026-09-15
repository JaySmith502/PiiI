#!/usr/bin/env node
/**
 * Generates the hosted privacy policy for the public docs repository.
 *
 * `PRIVACY.md` in this repo is the single source of truth. Both the Chrome Web
 * Store listing and the extension's own welcome page link to the generated
 * `privacy.html`, so the published policy cannot drift from the text the
 * extension ships with. Editing `PRIVACY.md` without regenerating is the one
 * failure mode this script exists to catch.
 *
 * The output is deliberately self-contained: no external font, stylesheet or
 * script, so opening the privacy policy makes zero third-party requests.
 *
 * Usage:
 *   node scripts/build-public-site.mjs [targetDir]
 *   node scripts/build-public-site.mjs --check [targetDir]
 *
 * targetDir defaults to ../PiiI-public (the public docs checkout).
 * `--check` fails with exit 1 if the published file is stale, without writing.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(ROOT, 'PRIVACY.md')

/** Where the site is published, and therefore what the store links to. */
export const SITE_URL = 'https://jaysmith502.github.io/PiiI-public/'
export const PRIVACY_URL = `${SITE_URL}privacy.html`
export const SUPPORT_URL = 'https://github.com/JaySmith502/PiiI-public/issues'

const OUTPUT_NAME = 'privacy.html'

// ---------------------------------------------------------------------------
// Minimal markdown subset renderer
//
// PRIVACY.md is written in a small, stable subset (headings, bold, inline code,
// links, autolinks, tables, lists, rules, paragraphs). A hand-rolled renderer
// keeps this dependency-free; `assertCovered()` below refuses to emit output if
// the source ever grows a construct the subset does not handle.
// ---------------------------------------------------------------------------

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function anchor(url, text) {
  const href = escapeHtml(url)
  return /^https?:/i.test(url)
    ? `<a href="${href}" target="_blank" rel="noreferrer">${text}</a>`
    : `<a href="${href}">${text}</a>`
}

/**
 * Stash tokens are namespaced per renderInline call. Without the id, a nested
 * call (inline code inside link text) receives the *outer* call's tokens, finds
 * them missing from its own stash, and substitutes an empty string — which
 * silently erased the label of the model-download link.
 */
let inlineCallId = 0

/** Restore stashed HTML until no tokens remain (stashed HTML may nest). */
function restore(html, stash, id) {
  const token = new RegExp(`\\u0000${id}:(\\d+)\\u0000`, 'g')
  let previous
  do {
    previous = html
    html = html.replace(token, (_, index) => stash[Number(index)] ?? '')
  } while (html !== previous)
  return html
}

export function renderInline(source) {
  const id = (inlineCallId += 1)
  const stash = []
  const hold = (html) => `\u0000${id}:${stash.push(html) - 1}\u0000`

  let out = source
  // Inline code first: its contents are literal and must not be re-parsed.
  out = out.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${escapeHtml(code)}</code>`))
  out = out.replace(/<(https?:\/\/[^>\s]+)>/g, (_, url) => hold(anchor(url, escapeHtml(url))))
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, text, url) => hold(anchor(url, renderInline(text))),
  )

  out = escapeHtml(out)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return restore(out, stash, id)
}

function splitRow(row) {
  // Respect escaped pipes (\|) so they do not split a cell.
  const guard = '\u0001'
  return row
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .replace(/\\\|/g, guard)
    .split('|')
    .map((cell) => cell.replaceAll(guard, '|').trim())
}

function renderTable(rows) {
  const isDivider = /^\|[\s:|-]+\|$/.test(rows[1] ?? '')
  if (!isDivider) throw new Error('table is missing its |---| divider row')

  const header = splitRow(rows[0])
  const body = rows.slice(2).map(splitRow)

  const head = header.map((cell) => `<th>${renderInline(cell)}</th>`).join('')
  const bodyRows = body
    .map((cells) => `<tr>${cells.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('\n')

  return [
    '<table>',
    `<thead><tr>${head}</tr></thead>`,
    '<tbody>',
    bodyRows,
    '</tbody>',
    '</table>',
  ].join('\n')
}

export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? 'ol' : 'ul'
      const items = list.items.map((item) => `<li>${renderInline(item)}</li>`).join('\n')
      html.push(`<${tag}>\n${items}\n</${tag}>`)
      list = null
    }
  }
  const flushAll = () => {
    flushParagraph()
    flushList()
  }

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()

    if (!trimmed) {
      flushAll()
      continue
    }

    if (trimmed.startsWith('|')) {
      flushAll()
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim())
      i -= 1
      html.push(renderTable(rows))
      continue
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushAll()
      html.push('<hr>')
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushAll()
      const level = heading[1].length
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = Boolean(numbered)
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((bullet ?? numbered)[1])
      continue
    }

    // A wrapped line continuing the current list item, not a new paragraph.
    if (list) {
      list.items[list.items.length - 1] += ` ${trimmed}`
      continue
    }

    paragraph.push(trimmed)
  }

  flushAll()
  return html.join('\n')
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Refuse to publish a policy that uses markdown this renderer would silently
 * mangle. A dropped construct in a legal document is worse than a build error.
 */
function assertCovered(markdown) {
  const unsupported = [
    { re: /^>\s/m, what: 'blockquote' },
    { re: /^```/m, what: 'fenced code block' },
    { re: /!\[[^\]]*\]\(/m, what: 'image' },
    { re: /^\s*[-*]\s+\[[ x]\]/m, what: 'task list' },
  ]
  for (const { re, what } of unsupported) {
    if (re.test(markdown)) {
      throw new Error(`PRIVACY.md uses a ${what}, which this renderer does not handle`)
    }
  }

  // Every markdown link must survive parsing, or a link would render as text.
  const linkCount = (markdown.match(/\[[^\]]+\]\([^)\s]+\)/g) ?? []).length
  const rendered = renderMarkdown(markdown)
  const renderedLinks = (rendered.match(/<a href=/g) ?? []).length
  const autolinks = (markdown.match(/<(?:https?:\/\/[^>\s]+)>/g) ?? []).length
  if (renderedLinks !== linkCount + autolinks) {
    throw new Error(
      `link count mismatch: PRIVACY.md has ${linkCount} links + ${autolinks} autolinks, ` +
        `renderer produced ${renderedLinks}`,
    )
  }

  // No raw markdown syntax should leak into the output.
  const leaked = rendered.match(/^\s*(#{1,6}\s|\|\s*---|\*\*)/m)
  if (leaked) throw new Error(`unrendered markdown leaked into output: ${leaked[0].trim()}`)

  // A link whose label vanished is the signature of a stash-token collision:
  // an empty anchor still contains "<a href" so the link count above misses it.
  const emptyAnchor = /<a\b[^>]*>\s*<\/a>/.exec(rendered)
  if (emptyAnchor) throw new Error(`renderer produced a link with no text: ${emptyAnchor[0]}`)

  // Stash tokens are internal; none may survive into the published page.
  if (/\u0000\d+:\d+\u0000/.test(rendered)) {
    throw new Error('an unresolved stash token leaked into the output')
  }
}

// ---------------------------------------------------------------------------
// Page template
// ---------------------------------------------------------------------------

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
const MONO = `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`

function template({ body, sourceSha }) {
  return `<!DOCTYPE html>
<!-- Generated by scripts/build-public-site.mjs from PRIVACY.md — do not edit by hand. -->
<!-- source-sha256: ${sourceSha} -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — PiiI</title>
<meta name="description" content="PiiI privacy policy: local-only processing, one first-run model download, no backend, no telemetry.">
<style>
  :root {
    --paper: #faf9f4;
    --ink: #111111;
    --muted: #5b5b58;
    --rule: #e3e0d6;
    --blue: #1f4fd8;
    --highlight: #fff4c2;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: ${FONT};
    font-size: 16px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 760px; margin: 0 auto; padding: 56px 24px 96px; }
  a { color: var(--blue); }
  h1 {
    font-size: 40px;
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  h2 {
    font-size: 22px;
    letter-spacing: -0.01em;
    margin: 44px 0 12px;
    padding-top: 20px;
    border-top: 1px solid var(--rule);
  }
  h3 { font-size: 17px; margin: 28px 0 8px; }
  p { margin: 0 0 16px; }
  strong { font-weight: 650; }
  hr { border: 0; border-top: 1px solid var(--rule); margin: 32px 0; }
  code {
    font-family: ${MONO};
    font-size: 0.88em;
    background: var(--highlight);
    border: 1px solid var(--rule);
    border-radius: 3px;
    padding: 1px 5px;
  }
  ul, ol { margin: 0 0 16px; padding-left: 22px; }
  li { margin-bottom: 8px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 20px;
    font-size: 14.5px;
  }
  th, td {
    text-align: left;
    vertical-align: top;
    padding: 9px 12px;
    border: 1px solid var(--rule);
  }
  th { background: #f2f0e8; font-weight: 650; }
  .site-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 36px;
    font-size: 13px;
  }
  .wordmark { font-weight: 800; font-size: 16px; letter-spacing: -0.02em; }
  .site-header a { text-decoration: none; }
  .site-header a:hover { text-decoration: underline; }
  .updated { color: var(--muted); font-size: 14px; }
  footer {
    margin-top: 64px;
    padding-top: 18px;
    border-top: 1px solid var(--rule);
    color: var(--muted);
    font-size: 13px;
  }
  @media print {
    body { background: #fff; }
    main { padding: 0; max-width: none; }
    .site-header, footer { display: none; }
  }
</style>
</head>
<body>
<main>
<header class="site-header">
  <span class="wordmark">PiiI</span>
  <a href="./">Overview</a>
  <a href="${SUPPORT_URL}">Support</a>
</header>
${body}
<footer>
  PiiI — AI data-loss prevention for Chrome. This page is generated from
  <code>PRIVACY.md</code> and makes no third-party requests.
</footer>
</main>
</body>
</html>
`
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build() {
  const markdown = readFileSync(SOURCE, 'utf8')
  assertCovered(markdown)
  const sourceSha = createHash('sha256').update(markdown).digest('hex')
  return { html: template({ body: renderMarkdown(markdown), sourceSha }), sourceSha }
}

function main() {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const positional = args.filter((arg) => !arg.startsWith('--'))
  const targetDir = resolve(positional[0] ?? resolve(ROOT, '..', 'PiiI-public'))
  const outputPath = resolve(targetDir, OUTPUT_NAME)

  if (!existsSync(targetDir)) {
    console.error(`target directory does not exist: ${targetDir}`)
    process.exit(1)
  }

  const { html, sourceSha } = build()

  if (check) {
    if (!existsSync(outputPath)) {
      console.error(`stale: ${outputPath} is missing — run npm run build:public-site`)
      process.exit(1)
    }
    const published = readFileSync(outputPath, 'utf8')
    if (published !== html) {
      const publishedSha = /source-sha256: ([0-9a-f]{64})/.exec(published)?.[1]
      console.error('stale: the published privacy policy does not match PRIVACY.md')
      console.error(`  PRIVACY.md  sha256 ${sourceSha}`)
      console.error(`  published   sha256 ${publishedSha ?? 'unknown'}`)
      console.error('  run: npm run build:public-site')
      process.exit(1)
    }
    console.log(`privacy policy is up to date (sha256 ${sourceSha.slice(0, 12)}…)`)
    return
  }

  writeFileSync(outputPath, html)
  console.log(`wrote ${outputPath}`)
  console.log(`  source  PRIVACY.md sha256 ${sourceSha}`)
  console.log(`  bytes   ${Buffer.byteLength(html)}`)
  console.log(`  url     ${PRIVACY_URL}`)
}

main()
