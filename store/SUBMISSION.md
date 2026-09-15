# Chrome Web Store — submission package

Everything needed to publish **PiiI v1.0.6**. Copy-paste from the fenced blocks.

- **Artifact:** `release/piii-1.0.6.zip`
- **Privacy policy URL:** `https://jaysmith502.github.io/PiiI-public/privacy.html`
- **Support URL:** `https://github.com/JaySmith502/PiiI-public/issues`
- **Homepage URL:** `https://jaysmith502.github.io/PiiI-public/`

---

## 1. Store listing

**Name** (75 max)

```
PiiI
```

**Summary / short description** (132 max — this one is 127)

```
Catch PII before you hit send. PiiI masks names, emails, phone numbers, IDs and cards in your AI chats — on-device, no backend.
```

**Category:** `Productivity`
**Language:** `English`

**Detailed description**

```
PiiI catches personal information before it leaves your browser and lands in a
third-party AI service.

Paste a customer email into ChatGPT, attach a spreadsheet to Claude, or ask
Gemini to summarise a contract — it inspects the text on the way out, shows you
what it found, and offers to swap each item for a stand-in before you hit send.

WHAT IT DETECTS

• Email addresses
• Phone numbers
• Names and postal addresses (on-device ML model)
• Social security numbers and tax IDs
• Credit card numbers
• Passwords, API keys and tokens
• Account, passport, licence and ID numbers
• URLs and dates

WHERE IT RUNS

ChatGPT, Claude, Gemini, Copilot and Perplexity. The complete list of supported
sites — with the exact URL patterns each one matches — is here:
https://github.com/JaySmith502/PiiI-public/blob/main/SITES.md

HOW IT WORKS

1. Install PiiI and pin it to your toolbar.
2. Open a supported chat site and write your message as you normally would.
3. Press send. If it finds anything sensitive it opens a review panel listing
   each detected item next to a suggested replacement.
4. Accept the suggestions, edit any of them, or send your original text
   unchanged.

Pattern-based categories (email, phone, credit card, SSN, API key) work the
moment you install. Name and address detection becomes available once the
detection model has finished downloading — see "Requirements and first run".

YOU STAY IN CONTROL

Nothing is rewritten silently. Every detection is offered to you in a review
panel first: accept the suggested stand-in, edit it, or send the original
instead. Nothing is changed until you say so.

REPLIES STAY READABLE

Redaction normally makes a reply impossible to follow — every name becomes the
same placeholder. The extension keeps a local alias map, so a name is consistently
"Alex Rivera" throughout the conversation and you can still read what came back.

AUDIT LOG

See exactly how many items of each kind were caught, and when. Export it to CSV
for your own records. The log records categories and counts — never the values
themselves.

ATTACHMENTS TOO

Attached .txt, .csv, .md, .log, .json, .docx and .pdf files are scanned before
they upload.

WHY YOU CAN TRUST IT

• No backend. No account. No sign-up.
• No analytics, no telemetry, no tracking.
• Your prompt text and files never leave your device.
• Detection runs locally: fast regex rules plus an on-device ML model.
• No PiiI-operated servers exist — there is nothing on our side to store, sell or leak.
• Open source under the MIT licence — read every line, or build it yourself.

The one exception is disclosed in full: on first run the extension fetches its
name/address detection model once from the Hugging Face CDN, then caches it.
That request contains none of your data. After it completes, detection is fully
offline.

The extension asks for five permissions and no host permissions at all. It reads
a page only on the chat sites listed above, and never requests access to tabs,
your browsing history, or other websites.

REQUIREMENTS AND FIRST RUN

• Chrome 120 or later.
• On first run it downloads roughly 300 MB of model weights once and caches
  them. On a fast connection this takes well under a minute; on a slow or metered
  connection it takes considerably longer, and the popup shows the progress.
• Until that download completes, pattern-based categories work and names and
  addresses are not yet detected. Press Retry in the popup if it fails.

KNOWN LIMITATIONS

PiiI is a safety net, not a guarantee. It surfaces what it finds and leaves the
decision to you. It cannot promise to catch every sensitive value, and it should
not be relied on as your only safeguard before sending data to a third party.

• Detection is best-effort. Pattern rules and a machine-learning model will
  occasionally miss a value, or flag something harmless.
• Chat sites change their page structure often. If interception stops firing on
  a site, reload the tab so the extension can re-attach, and check for an update.
• The interface is English only. Detection itself is multilingual.

DELETING YOUR DATA

Pause protection, clear the audit log, clear the alias map and clear the
whitelist at any time from the toolbar popup. Uninstalling the extension deletes
everything it stored, because all of it lives inside your browser profile and
nowhere else.

TROUBLESHOOTING

The popup says the model is unavailable. Pattern rules still work; only names and
addresses are affected. The model is fetched once from a public CDN, so a
corporate proxy or firewall that blocks that CDN will keep it unavailable.

Nothing is detected on a site that should work. Open the popup and check that the
header reads Active. If it reads Paused, click Resume protection, then reload the
tab.

A term keeps getting flagged. Add it to the whitelist in the popup, or select it
on the page and press Alt+Shift+A.

LINKS

Source code:
https://github.com/JaySmith502/PiiI
Full supported-site list:
https://github.com/JaySmith502/PiiI-public/blob/main/SITES.md
Privacy policy:
https://jaysmith502.github.io/PiiI-public/privacy.html
Support and bug reports:
https://github.com/JaySmith502/PiiI-public/issues

PiiI has no backend, no account and no telemetry — see the privacy policy above
for the full detail. PiiI is open source under the MIT licence.
```

> **Length:** 5,149 characters of the 16,000 allowed. Longer is fine, but
> **do not add more brand names.** The CWS keyword-spam policy caps the sites or
> brands *listed* in a description at **five**, and this copy already uses five
> (ChatGPT, Claude, Gemini, Copilot, Perplexity). Additional sites go behind the
> GitHub link, which the policy explicitly permits.
>
> Grok is deliberately omitted. `README.md` documents it as *"best-effort, not
> supported"* — listing it invites a reviewer to test it and find it broken.
> Keep the product name to a handful of prose mentions (currently 3); Google
> advises keeping any single keyword under five instances.

**Graphic assets**

| Asset | Requirement | Status |
|---|---|---|
| Store icon | 128×128 PNG | `icons/icon128.png` ✅ |
| Screenshots | 1–5, 1280×800 or 640×400 | ✅ 4 captured at 1280×800 in `store/screenshots/` — see §5 |
| Small promo tile | 440×280 PNG (optional, needed to be featured) | ✅ `store/promo/tile-440x280.png` — see §5 |
| Marquee promo tile | 1400×560 PNG (optional, wide hero banner) | ✅ `store/promo/marquee-1400x560.png` — see §5 |

---

## 2. Privacy practices tab

### 2a. Single purpose statement

```
PiiI has one purpose: to detect personal information in the text and attachments
you are about to send to an AI chat service, and to let you replace that
information before it leaves your browser.
```

### 2b. Permission justifications

Paste one per field.

**`storage`**
```
Saves the user's settings, alias map, whitelist and audit log on the user's own
machine via chrome.storage.local. Nothing is synced and nothing is transmitted to
the developer or any third party.
```

**`contextMenus`**
```
Adds an "Always allow this term" item to the right-click menu, so the user can
whitelist a word that PiiI flagged but that they do not consider sensitive. This
is the only menu item the extension adds.
```

**`activeTab`**
```
Grants temporary access to the current tab only when the user invokes a PiiI
command deliberately, so the extension can act on the page the user is already
looking at. It is not used to observe browsing.
```

**`alarms`**
```
Schedules a periodic background check that the local detection model loaded
correctly, so the extension can tell the user if it needs to re-download rather
than silently failing to detect anything.
```

**`offscreen`**
```
PiiI runs its name/address detection model in an offscreen document because an
MV3 service worker cannot load or run a WASM/ONNX model. The document exists
solely to run inference locally; it makes no network requests itself.
```

**Host permissions justification** — (none requested)

```
PiiI requests no host permissions and no <all_urls>. Access is limited to the
nine URL patterns declared in the content script, which cover seven chat services
(ChatGPT, Claude, Gemini, Copilot, Grok, Perplexity, DeepSeek) — two services are
matched by two patterns each (chat.openai.com and chatgpt.com; grok.com and
x.com/i/grok). These are the sites where the redaction feature has to run to be
useful. The extension does not read any other site.
```

### 2c. Remote code — answer this carefully

The form asks whether the extension uses remote code. **Answer: No** for executable
code — but declare the model download in the free-text field, because a reviewer
will see the network request in the source and an unexplained fetch looks like a
concealment attempt.

```
No executable remote code. All JavaScript and the ONNX/WASM inference runtime are
bundled inside the extension package; the content_security_policy is
script-src 'self' 'wasm-unsafe-eval', and the WASM runtime is served from the
extension's own origin rather than a CDN.

One clarification, disclosed in the privacy policy: on first run the extension
downloads ~296 MB of model *weights* (static data files) once from the Hugging
Face CDN, for the public model onnx-community/multilang-pii-ner-ONNX, and the
browser caches them. These are data files interpreted by the bundled runtime, not
code, and they are not executed. The request contains no user data and carries no
user identifier. Detection runs fully offline thereafter. The model is a public
one, hosted by Hugging Face and independently inspectable:
https://huggingface.co/onnx-community/multilang-pii-ner-ONNX
```

### 2d. Data usage disclosures

The form lists data categories and asks what the extension **collects**. CWS
defines collection as transmitting data off the device to the developer or a third
party. PiiI transmits nothing, so **every category is unchecked**.

You must still be able to defend it, so tick the three certification boxes and
keep this reasoning to hand if the reviewer asks:

- PiiI *processes* prompt text and attachments, but strictly in-memory and
  strictly locally. It is never persisted and never transmitted.
- The audit log stores detection *categories* and *counts* — not the values.
- The alias map holds real→placeholder pairs in `chrome.storage.local` on the
  user's own machine. It is local storage, not collection.
- The only network request is a `GET` for public model weights, with no user data
  in it.

Certifications to tick: no data sold to third parties; no use unrelated to the
single purpose; no use to determine creditworthiness or for lending.

---

## 3. Verification steps for the reviewer

Give the reviewer a URL to test — without one they have to guess, and a PII
extension that cannot be exercised is likely to bounce.

```
No account or credentials are required.

1. Install the extension.
2. Open https://chatgpt.com (or https://claude.ai).
3. In the message box, type: "My name is John Smith, call me on (555) 867-5309 or
   email john.smith@example.com, my card is 4111 1111 1111 1111."
4. Press the send button. PiiI intercepts before submission and shows a review
   panel listing every detected item with a suggested replacement.
5. Accept the replacements and send. The message that reaches the model contains
   the placeholders, not the original values.
6. Open the toolbar popup to see the audit log and to pause protection, clear the
   audit log, or manage the whitelist.

Note on first run: the name/address model (~296 MB) downloads once and the UI
shows its progress. Regex detection works immediately; names and addresses are
detected once the model is ready. On a fast connection this takes well under a
minute; on a slow one it will take considerably longer.
```

---

## 4. Pre-submission checklist

- [x] `manifest.json` at the archive root, version `1.0.6`
- [x] Version is a plain `x.y.z` (the store rejects a `-beta` suffix)
- [x] `web_accessible_resources` scoped to chat domains — no `<all_urls>`
- [x] Every `web_accessible_resources` match is origin-level with a literal `/*`
      path. **v1.0.3 shipped `https://x.com/i/grok*` here and Chrome refused the
      entire manifest — the package would not install.** Chrome's WAR grammar is
      stricter than the content-script grammar, and a violation is silent to the
      user. Never copy the content-script match list into WAR; collapse each
      pattern to its origin.
- [x] Package loads in real Chromium (`npm run verify:extension` — worker
      registers, popup renders). This runs automatically inside `npm run package`.
- [x] No `host_permissions`
- [x] Privacy policy written and public
- [x] Under the 2 GB package limit; only production assets in the archive
- [x] Screenshots captured (§5) — `store/screenshots/`, 4 × 1280×800, plus the
      640×400 downscale set in `store/screenshots/640x400/`
- [x] Small promo tile captured — `store/promo/tile-440x280.png`
- [x] Marquee promo tile captured — `store/promo/marquee-1400x560.png`
- [x] Description lists exactly five brands and keeps the product name to three
      prose mentions (CWS keyword-spam policy: no more than five supported
      sites/brands listed; keep any single keyword under five instances)
- [ ] $5 developer registration paid (one-off)
- [ ] Store listing text pasted
- [ ] Privacy practices tab completed (§2)
- [ ] Trader / non-trader declaration completed (required for EU distribution)
- [ ] Reviewer test instructions pasted (§3)

---

## 5. Screenshots

**Captured.** Four images, all exactly 1280×800, in `store/screenshots/`. Upload
them in this order — the first is the one the listing leads with. Both promo
tiles live in `store/promo/` and are uploaded on the same tab.

| # | File | Shows |
|---|---|---|
| 1 | `01-detections-in-composer.png` | PiiI flagging email, phone, card, SSN and URL inline in the composer, before send |
| 2 | `02-review-panel.png` | The review panel with all 5 detections and their suggested aliases — **the money shot** |
| 3 | `03-popup-audit-log.png` | Toolbar popup: master toggle, audit log, clear-data controls |
| 4 | `04-welcome.png` | Welcome page: what PiiI detects, and the five permissions |

**Promo tiles** — both optional, both captured, uploaded on the same tab:

| Tile | File | Size | Notes |
|---|---|---|---|
| Small | `store/promo/tile-440x280.png` | 440×280 | Shown in the store grid and needed to be considered for featuring. Read at thumbnail size, so it carries only the mark, the name and one line. |
| Marquee | `store/promo/marquee-1400x560.png` | 1400×560 | The wide hero banner on the store front page, viewed large. Shares the small tile's headline so the two read as a pair. |

**Two screenshot sizes are accepted** — `1280×800` **or** `640×400`. Upload the
1280×800 set; it is the sharper of the two. The 640×400 downscales are written to
`store/screenshots/640x400/` so the smaller option needs no extra tooling, but
**do not upload both sets to one listing.**

Regenerate any time with:

```
npm run build && npm run screenshots
```

That writes all ten assets — 4 screenshots, 4 downscales and both promo tiles.
The script loads the **shipped build** into Chromium and drives the real content
script against a local fixture page standing in for the chat composer — the
detectors, highlight overlay, review panel and popup are the actual shipped code.
Only the host page markup is a fixture, because that page is not ours. Captures
are self-verified for size, colour count and luminance, and the script exits
non-zero if any comes back blank, black or mis-sized.

The first-run model download is blocked during capture so it does not run over the
network; pattern-rule detection (email, phone, card, SSN, URL) is synchronous and
needs no model, which is why the panel shows five rows. Once the model is cached,
name and address rows appear as well.

Note for the listing: screenshots 1 and 2 are a real render of the interface but
against a representative ChatGPT-like page, not a live logged-in session. That is
standard practice for extension listings and nothing in the images is fabricated
about PiiI's own UI.

---

## 6. Known review risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Model download on first run** | Automated review flags *any* outbound request from an extension that handles PII. A ~296 MB fetch from a third-party CDN with no explanation reads badly — and it is large enough that a reviewer may test on a metered or throttled connection and conclude the extension is broken. | Disclosed in `PRIVACY.md`, in the listing copy, and in §2c. State plainly that it is a data fetch, not code, and that it carries no user data. This is the single most likely cause of a rejection — lead with it rather than waiting to be asked. |
| **First-run UX: ~296 MB** | Even if review passes, users on slow connections hit a long, unexplained wait — and the README currently claims "a few seconds", which is wrong and will read as a broken promise. | Corrected in the README. Consider a smaller model variant or prose detection for names until the model lands. |
| **"PII extension is asking for `activeTab`"** | CWS is strict about extensions that touch page content. | No `host_permissions`, no `<all_urls>`, no `tabs`/`webRequest`/`scripting`. Say so explicitly in the justification. |
| **On-device ML may read as data collection** | Reviewers conflate processing with collecting, and PiiI's entire purpose involves reading PII. | Every data-usage box is correctly *unchecked*; §2d supplies the defence. Be ready to explain the local-only path. |
| **`offscreen` document** | Frequently queried; reviewers ask why a service worker is insufficient. | §2b explains MV3 cannot host WASM/ONNX inference. |
| **`wasm-unsafe-eval` in the CSP** | `unsafe-eval` in any form draws scrutiny. | It is the narrow `wasm-unsafe-eval`, not `unsafe-eval`, and it is required to run local WASM inference. Explain if asked. |
| **"PiiI" branding / lookalike check** | Short names can collide with existing listings. | Name collision will surface at submission; rename in `vite.config.ts` if the console objects. |

Rejection is common on a first submission for extensions in this category. If it
is rejected for the model download, the fallback is to bundle the model weights
inside the package (removing the network request entirely) — that trades a ~282 MiB
install size for a materially easier review.

Sizing note, verified against the Hugging Face API on 2026-09-15: the pipeline
requests `q8` because `transformers.js` maps the WASM device to the `q8` dtype by
default, which resolves to `onnx/model_quantized.onnx` at 278.7 MB. The tokenizer
adds 17.1 MB, all other config files under 10 KB, for **~296 MB (282 MiB)** total.
The alternative variants are much larger — `model.onnx` (fp32) is 1.11 GB and
`model_q4.onnx` is 823 MB — so if the default ever stops resolving to `q8`, the
first-run download silently grows by 3-4×. **Resolved in v1.0.5:** the
`pipeline()` call now pins `{ dtype: 'q8' }` explicitly, so the size guarantee no
longer depends on an upstream default.
