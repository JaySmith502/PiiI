# Changelog

All notable changes to PiiI are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.6] — 2026-09-15

### Changed

- **Every user-facing link now points at the public documentation repository.**
  The source repository is private, which broke four URLs that shipped inside
  v1.0.5: `homepage_url` in the manifest, the "Source & issues" and "Privacy
  policy" links on the onboarding page, and the popup's "Report a problem" link.
  Users and reviewers would have hit a 404 on all four — including the in-product
  privacy policy, which is the one a reviewer is most likely to click. URLs are
  now declared once in `src/config/links.ts` and imported by both the manifest
  config and the UI, so they cannot drift apart again.
- **The published privacy policy is generated rather than hand-maintained.**
  `scripts/build-public-site.mjs` renders `PRIVACY.md` — the same file the
  extension ships with — into `privacy.html` in the public repository. Run
  `node scripts/build-public-site.mjs --check` to fail if the published copy is
  stale. This is what stops the store listing's privacy policy from drifting out
  of sync with the text users can read inside the extension.

### Fixed

- Removed the "open source" claim from the store listing and from the manifest
  and `package.json` descriptions. Now that the source is not published, the
  claim would have been inaccurate, and a listing that overstates what a user can
  verify is a straightforward rejection risk.

## [1.0.5] — 2026-09-15

### Changed

- **Pinned the detection model's quantisation explicitly.** `pipeline()` now
  requests `{ dtype: 'q8' }` instead of relying on transformers.js to map the WASM
  device to that dtype by default. The behaviour today is unchanged — the default
  already resolves to `q8`, i.e. `onnx/model_quantized.onnx` — but the default is
  not part of any contract with the upstream library, and it decides the size of
  the first-run download. An fp32 fallback (`model.onnx`) is 1.11 GB, roughly 4×
  the ~296 MB that `PRIVACY.md` and the store listing promise. Pinning it means
  the documented size cannot drift without a visible change in the source.
- `scripts/screenshots.mjs` now also renders the 440×280 small promo tile
  (`store/promo/`), so `npm run screenshots` emits the complete store graphic set.
  `verifyShot()` takes expected dimensions rather than assuming 1280×800, which
  puts the tile under the same blank/black/mis-sized check as the screenshots.

## [1.0.4] — 2026-09-15

### Fixed

- **Chrome refused to install v1.0.3.** The `web_accessible_resources` list
  introduced in 1.0.3 was copied straight from the content-script match list,
  which included the path-bearing pattern `https://x.com/i/grok*`. Chrome's
  `web_accessible_resources` grammar only accepts host-level patterns with a
  literal `/*` path, so it rejected the whole manifest with an "Invalid match
  pattern" error and the extension would not install at all — silently, from the
  user's point of view. The worker list is now derived by collapsing each
  content-script pattern to its origin, which cannot widen what the extension can
  read (the field only controls which pages may load the listed files; it grants
  no host access).
- Corrected a documentation error in the same commit: the released 1.0.3 archive
  was confirmed uninstallable by loading it into Chromium, so 1.0.4 supersedes it.

### Added

- `scripts/validate-extension.mjs` — loads the built package into real Chromium
  and asserts that the service worker registers and the popup renders. Unit tests
  and `tsc` both pass on a manifest Chrome refuses; this is the only check that
  catches an uninstallable build. It now runs as part of `npm run package`, so no
  future archive can be built without being Chrome-validated.
- `scripts/screenshots.mjs` — captures the store screenshot set (1280×800) by
  driving the shipped content script against a local chat-composer fixture, with
  self-verification of size, colour count and luminance for each capture.

### Documentation

- Corrected the stated first-run model download size. The README claimed the model
  "downloads in a few seconds"; the actual payload is **~296 MB** (278.7 MB of
  quantised model weights from `onnx/model_quantized.onnx`, plus a 17.1 MB
  tokenizer). The download is one-time and cached, but the previous wording
  materially understated it and would read to a user as a hang or a failure.
- Added `store/SUBMISSION.md`: the Chrome Web Store listing copy, permission
  justifications, data-usage disclosures, reviewer test steps, and known review
  risks.

## [1.0.3] — 2026-09-15

### Changed

- **Narrowed `web_accessible_resources` from `<all_urls>` to the supported chat
  sites.** The bundled PDF worker was reachable from any origin on the web; it is
  only ever loaded by the content script, which runs exclusively on the nine
  supported chat domains, so the exposure was unnecessary. The content-script
  match list is now defined once and shared by both declarations, so the two
  cannot drift apart.

## [1.0.2] — 2026-09-15

### Fixed

- **Email detection no longer swallows surrounding punctuation.** The detector's
  greedy local-part pattern absorbed whatever delimiter preceded an address, so
  `(john@example.com)`, `<jane@corp.co.uk>`, `"a@b.com"`, and a comma-separated
  list all produced spans that started on the punctuation. Redaction then replaced
  that punctuation along with the address and mangled the user's sentence. The
  local part is now bounded to exclude the bracket, quote, comma, semicolon, and
  colon characters that delimit an address in prose.
- **Modern gTLDs are recognised.** The TLD portion was capped at 6 characters, so
  addresses ending in newer TLDs such as `.photography` were truncated or missed;
  it now accepts up to 24 characters.

### Added

- Regression tests covering both the delimiter-bleed and short-TLD cases.

## [1.0.1] — 2026-09-15

### Fixed

- **Phone numbers ending a sentence are detected again.** The version-number guard
  rejected any match with a period on either side, which silently dropped the
  most common phrasing of all: `call me at (555) 867-5309.` The guard now only
  rejects a match that sits *inside* a dotted digit run (e.g. `1.555.555.5555.6`).

### Changed

- Raised the minimum Node version for building to 22.13 (`pdfjs-dist` requires it).
- Updated `pdfjs-dist` to 6.2 and `postcss` to 8.5.

### Security

- Added a **Security** section to the README documenting the dependency audit,
  host-permission scope, and the fail-closed behaviour of file scanning.

## [1.0.0] — 2026-09-15

### Added

- Initial release.
- Detection of email, phone, SSN, credit card, API key, account/ID number, URL,
  and date via local regex rules.
- Detection of names and addresses via a local ONNX NER model
  (`onnx-community/multilang-pii-ner-ONNX`) running in an offscreen document.
- Redaction review panel: accept the suggested aliases, edit, or send the original.
- Local alias map so replies can be read in context.
- Audit log with CSV export.
- Whitelist, plus an `Alt+Shift+A` "always allow this term" hotkey.
- Attachment scanning for `.txt`, `.csv`, `.md`, `.log`, `.json`, `.docx`, `.pdf`.
- Support for ChatGPT, Claude, Gemini, Copilot, Perplexity, and DeepSeek.

[Unreleased]: https://github.com/JaySmith502/PiiI/compare/v1.0.6...HEAD
[1.0.6]: https://github.com/JaySmith502/PiiI/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/JaySmith502/PiiI/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/JaySmith502/PiiI/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/JaySmith502/PiiI/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/JaySmith502/PiiI/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/JaySmith502/PiiI/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/JaySmith502/PiiI/releases/tag/v1.0.0
