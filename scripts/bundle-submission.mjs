#!/usr/bin/env node
/**
 * Assembles a self-contained Chrome Web Store submission bundle under release/.
 *
 * Why this exists: publishing runs across three separate places — the upload
 * archive in release/, the listing graphics in store/, and the two documents you
 * read from while filling the console form. Hunting between them mid-form is how
 * you upload the previous version's screenshots. This gathers everything into one
 * folder, and rewrites the runbook's paths so they resolve *inside* that folder
 * rather than relative to the repo root.
 *
 * The bundle is a snapshot. Everything in it is verified before it is copied, and
 * the path rewrites are asserted rather than assumed: if DEPLOYMENT.md stops
 * containing a path we expect to rewrite, this fails loudly instead of emitting a
 * bundle full of dead links.
 *
 * Output: release/submission-bundle/ (+ a zip of it, for moving between machines)
 *
 * Usage:  npm run bundle:submission
 *         Requires `npm run package` first — it builds the archive this consumes.
 */

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rel = p => path.relative(root, p)

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const version = pkg.version
const artifactName = `piii-${version}.zip`
const artifactPath = path.join(root, 'release', artifactName)
const outDir = path.join(root, 'release', 'submission-bundle')

// Listing graphics, with the dimensions the console enforces. Verified by reading
// the PNG IHDR header directly — no image dependency needed.
const SCREENSHOTS = [
  '01-detections-in-composer.png',
  '02-review-panel.png',
  '03-popup-audit-log.png',
  '04-welcome.png',
]
const ASSETS = [
  { src: 'icons/icon128.png', dest: 'icon128.png', w: 128, h: 128 },
  ...SCREENSHOTS.map(f => ({ src: `store/screenshots/${f}`, dest: f, w: 1280, h: 800 })),
  { src: 'store/promo/tile-440x280.png', dest: 'tile-440x280.png', w: 440, h: 280 },
  { src: 'store/promo/marquee-1400x560.png', dest: 'marquee-1400x560.png', w: 1400, h: 560 },
]

// Documents copied verbatim into the bundle.
const DOCS = [
  { src: 'store/DEPLOYMENT.md', dest: 'DEPLOYMENT.md', rewritePaths: true },
  { src: 'store/SUBMISSION.md', dest: 'SUBMISSION.md' },
  { src: 'PRIVACY.md', dest: 'reference/PRIVACY.md' },
  { src: 'CHANGELOG.md', dest: 'reference/CHANGELOG.md' },
  { src: 'README.md', dest: 'reference/README.md' },
]

const die = msg => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// Provenance for the bundle header. Best-effort: a bundle built outside a git
// checkout is still valid, just less traceable.
let commit = null
let dirty = false
try {
  commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim() !== ''
} catch {
  commit = null
}

// ---------------------------------------------------------------------------
// 1. Verify the upload archive before anything is copied from it.
// ---------------------------------------------------------------------------
if (!fs.existsSync(artifactPath)) {
  die(`${rel(artifactPath)} not found — run 'npm run package' first.`)
}

const bytes = fs.readFileSync(artifactPath)
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')

const listing = execFileSync('unzip', ['-l', artifactPath], { encoding: 'utf8' })
const manifestEntries = listing
  .split('\n')
  .filter(l => /\smanifest\.json$/.test(l))
  .map(l => l.trim().split(/\s+/).pop())

if (manifestEntries.length !== 1 || manifestEntries[0] !== 'manifest.json') {
  die(
    `manifest.json must be the only match and sit at the archive ROOT.\n` +
      `  Found: ${manifestEntries.length ? manifestEntries.join(', ') : 'nothing'}\n` +
      `  The store rejects a nested path such as "dist/manifest.json".`,
  )
}

const manifest = JSON.parse(
  execFileSync('unzip', ['-p', artifactPath, 'manifest.json'], { encoding: 'utf8' }),
)
if (manifest.version !== version) {
  die(`artifact is v${manifest.version} but package.json says v${version} — re-run 'npm run package'.`)
}
if ('host_permissions' in manifest) {
  die(
    'artifact declares host_permissions, but PiiI is designed to request none.\n' +
      '  Shipping them changes what you must declare in Step 5b of the runbook.',
  )
}

console.log(`✓ artifact verified — ${artifactName}, v${manifest.version}, no host_permissions`)

// ---------------------------------------------------------------------------
// 2. Verify every listing asset exists at the dimensions the console requires.
// ---------------------------------------------------------------------------
for (const asset of ASSETS) {
  const p = path.join(root, asset.src)
  if (!fs.existsSync(p)) die(`listing asset missing: ${asset.src} — run 'npm run screenshots'.`)

  const buf = fs.readFileSync(p).subarray(0, 24)
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    die(`${asset.src} is not a PNG.`)
  }
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  if (w !== asset.w || h !== asset.h) {
    die(`${asset.src} is ${w}x${h}, expected ${asset.w}x${asset.h}.`)
  }
}
console.log(`✓ ${ASSETS.length} listing assets verified at spec dimensions`)

// ---------------------------------------------------------------------------
// 3. Prepare the documents in memory, before touching the existing bundle.
//
// Ordering matters. The rewrite assertions below can fail, and an earlier version
// of this script wiped outDir first — so a failed run destroyed the previous good
// bundle and left nothing in its place. Everything that can fail is resolved
// before anything is removed.
// ---------------------------------------------------------------------------

// Rewrite the runbook so its paths resolve inside the bundle. Each rewrite is
// asserted: a missing pattern means the runbook changed shape, and a bundle with
// stale paths is worse than no bundle.
const REWRITES = [
  [`release/${artifactName}`, `artifact/${artifactName}`],
  ['store/SUBMISSION.md', 'SUBMISSION.md'],
  ['store/screenshots/', 'listing-assets/'],
  ['store/promo/tile-440x280.png', 'listing-assets/tile-440x280.png'],
  ['store/promo/marquee-1400x560.png', 'listing-assets/marquee-1400x560.png'],
  ['icons/icon128.png', 'listing-assets/icon128.png'],
  ['cd /Users/smith/workspace/PiiI', `cd ${outDir}`],
  ['| `PRIVACY.md` |', '| `reference/PRIVACY.md` |'],
  ['| `CHANGELOG.md` |', '| `reference/CHANGELOG.md` |'],
  ['| `README.md` |', '| `reference/README.md` |'],
]

const preparedDocs = DOCS.map(doc => {
  const src = path.join(root, doc.src)
  if (!fs.existsSync(src)) die(`document missing: ${doc.src}`)

  let text = fs.readFileSync(src, 'utf8')
  if (doc.rewritePaths) {
    for (const [from, to] of REWRITES) {
      if (!text.includes(from)) {
        die(`cannot rewrite "${from}" in ${doc.src} — the document changed shape. Update REWRITES.`)
      }
      text = text.replaceAll(from, to)
    }
    console.log(`✓ ${doc.dest} rewritten bundle-relative (${REWRITES.length} paths)`)
  }
  return { dest: doc.dest, text }
})

// ---------------------------------------------------------------------------
// 4. Build the bundle. Nothing below here is expected to fail, so the previous
//    bundle is only replaced once every input has been verified.
// ---------------------------------------------------------------------------
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(path.join(outDir, 'artifact'), { recursive: true })
fs.mkdirSync(path.join(outDir, 'listing-assets'), { recursive: true })
fs.mkdirSync(path.join(outDir, 'reference'), { recursive: true })

fs.copyFileSync(artifactPath, path.join(outDir, 'artifact', artifactName))
for (const asset of ASSETS) {
  fs.copyFileSync(path.join(root, asset.src), path.join(outDir, 'listing-assets', asset.dest))
}
for (const doc of preparedDocs) {
  fs.writeFileSync(path.join(outDir, doc.dest), doc.text)
}

// ---------------------------------------------------------------------------
// 5. Checksum manifest and a repository-free verification script.
// ---------------------------------------------------------------------------
const sums = [
  `${sha256}  artifact/${artifactName}`,
  ...ASSETS.map(a => {
    const h = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, a.src)))
      .digest('hex')
    return `${h}  listing-assets/${a.dest}`
  }),
].join('\n')
fs.writeFileSync(path.join(outDir, 'SHA256SUMS.txt'), `${sums}\n`)

fs.copyFileSync(path.join(root, 'scripts', 'verify-bundle.sh'), path.join(outDir, 'verify.sh'))
fs.chmodSync(path.join(outDir, 'verify.sh'), 0o755)

fs.writeFileSync(
  path.join(outDir, 'START-HERE.md'),
  startHere({ version, artifactName, sha256, sizeBytes: bytes.length, commit, dirty }),
)

// ---------------------------------------------------------------------------
// 6. Zip the bundle for moving between machines.
// ---------------------------------------------------------------------------
const bundleZip = path.join(root, 'release', `piii-submission-bundle-${version}.zip`)
fs.rmSync(bundleZip, { force: true })
execFileSync('zip', ['-r', '-q', bundleZip, path.basename(outDir), '-x', '*.DS_Store'], {
  cwd: path.join(root, 'release'),
  stdio: 'inherit',
})

console.log(`\n✓ bundle ready: ${rel(outDir)}`)
console.log(`✓ transferable: ${rel(bundleZip)} (${(fs.statSync(bundleZip).size / 1e6).toFixed(1)} MB)`)
console.log(`\n  Start with ${rel(outDir)}/START-HERE.md — it maps every console field to a file.`)

// ---------------------------------------------------------------------------

function startHere({ version, artifactName, sha256, sizeBytes, commit, dirty }) {
  // Decimal MB, matching the Chrome Web Store and DEPLOYMENT.md. Mixing units
  // across two documents you read side by side invites a wrong-artifact upload.
  const mb = (sizeBytes / 1e6).toFixed(2)
  return `# Start here — PiiI v${version} Chrome Web Store submission

Everything the submission form asks for is in this folder. You should not need to
open the repository at all.

Open **\`DEPLOYMENT.md\`** — it is the step-by-step runbook, in the order the
console forces you through. Open **\`SUBMISSION.md\`** — that is the paste-ready
text. Have those two side by side; this file is the map between them.

${
  commit
    ? `Built from commit \`${commit}\`${dirty ? ' **with uncommitted changes present** — so what you upload may differ slightly from that commit' : ''}.`
    : 'Built outside a git checkout — commit provenance unavailable.'
}
This bundle is a snapshot: if the source changes, re-run \`npm run bundle:submission\`.

---

## The upload package

| Field | Value |
|---|---|
| File | \`artifact/${artifactName}\` |
| Version | \`${version}\` |
| Size | ${mb} MB (${sizeBytes.toLocaleString('en-US')} bytes) |
| SHA-256 | \`${sha256}\` |

Verify it before uploading — \`./verify.sh\` does this without needing the repo.

---

## Console field → file

### Graphics (Store listing tab)

| Console field | Upload this file |
|---|---|
| Store icon | \`listing-assets/icon128.png\` |
| Screenshot 1 | \`listing-assets/01-detections-in-composer.png\` |
| Screenshot 2 | \`listing-assets/02-review-panel.png\` |
| Screenshot 3 | \`listing-assets/03-popup-audit-log.png\` |
| Screenshot 4 | \`listing-assets/04-welcome.png\` |
| Small promo tile | \`listing-assets/tile-440x280.png\` |
| Marquee promo tile | \`listing-assets/marquee-1400x560.png\` |

**Upload the screenshots in the numbered order.** Screenshot 1 leads the listing
in search results — the numbering matches the upload order, so sort by filename.
Both screenshot sizes are accepted (1280x800 **or** 640x400); this bundle carries
the 1280x800 set only, which is the one to upload.

### Text (paste from these)

| Console field | Paste from |
|---|---|
| Name, summary, detailed description | \`SUBMISSION.md\` §1 |
| Single purpose statement | \`SUBMISSION.md\` §2a |
| Permission justifications (×5) | \`SUBMISSION.md\` §2b |
| Remote code + model-download disclosure | \`SUBMISSION.md\` §2c |
| Data usage defence (if challenged) | \`SUBMISSION.md\` §2d |
| Reviewer instructions — 500-char field | \`SUBMISSION.md\` §3a (leave username/password blank) |
| Reviewer instructions — no limit | \`SUBMISSION.md\` §3b |
| Pre-submission checklist | \`SUBMISSION.md\` §4 |

**Do not skip §2c's free-text field.** See below.

---

## Before you start: the one thing that decides the review

PiiI makes **one outbound request on first run**, for ~296 MB of ML model
weights used for name and address detection. A reviewer *will* see it in the
source.

Disclose it yourself in the remote-code free-text field, using §2c's wording. A
self-disclosed download is a clarification. A discovered one is an integrity
flag — and that is the difference between a re-review and a rejection.

Regex detection (email, phone, card, SSN, URL) works instantly and offline. Names
and addresses need the model, so a reviewer on a throttled connection may see
"nothing detected" and conclude the extension is broken. §3's reviewer
instructions pre-empt this. Paste them — §3a if the console caps the field at 500
characters, §3b if it does not. There is no account to sign into: leave any
username and password fields blank.

---

## Folder contents

\`\`\`
START-HERE.md          this file — the map
DEPLOYMENT.md          the step-by-step runbook (10 steps)
SUBMISSION.md          all paste-ready listing text and justifications
verify.sh              re-checks the artifact and assets without the repo
SHA256SUMS.txt         checksums for every upload file
artifact/              the Chrome Web Store upload package
listing-assets/        icon, 4 screenshots, promo tile
reference/
  PRIVACY.md           the privacy policy (its public URL is in DEPLOYMENT.md 5e)
  CHANGELOG.md         version history
  README.md            architecture and build notes
\`\`\`

---

## Two things this bundle cannot do

**It cannot submit for you.** Registration, the $5 fee, and the first upload all
run against your Google identity. The Chrome Web Store API can only update an
item that already exists in your account, so a *first* submission is manual by
design.

**It is not the repository.** \`reference/README.md\`, \`CHANGELOG.md\` and
\`PRIVACY.md\` are copies for convenience. The live privacy policy URL points at
GitHub — editing the copy here does not change what reviewers see. Edit in the
repo and push.
`
}
