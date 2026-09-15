# Changelog

All notable changes to PiiI are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/JaySmith502/PiiI/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/JaySmith502/PiiI/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/JaySmith502/PiiI/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/JaySmith502/PiiI/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/JaySmith502/PiiI/releases/tag/v1.0.0
