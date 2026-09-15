# Privacy Policy

**PiiI — AI data-loss prevention for Chrome**
Last updated: 15 September 2026

PiiI exists to keep personal data **out** of third-party services. It is built to
hold as little of your data as possible, and to send none of it anywhere.

The short version: **PiiI has no backend.** There is no account, no server, no
analytics, and no telemetry. Everything the extension does happens inside your
browser, on your machine.

---

## What PiiI processes

When you send a message on a supported chat site, PiiI inspects the text in the
composer (and any file you attach) to find personal data before it leaves the
browser. This processing happens **entirely on your device**:

| Data | Where it is processed | Where it is stored |
|------|-----------------------|--------------------|
| Chat prompt text | In the page, by the content script (regex) and, for names/addresses, by an ONNX model running in an offscreen document | Not stored |
| Attached files (`.txt`, `.csv`, `.md`, `.log`, `.json`, `.docx`, `.pdf`) | Extracted and scanned locally | Not stored |
| Alias map (real value → placeholder) | Locally | `chrome.storage.local` |
| Audit log (categories, action, counts — never the raw values) | Locally | `chrome.storage.local` |
| Whitelist and settings | Locally | `chrome.storage.local` |

Prompt text and file contents are held in memory only for as long as it takes to
find and offer to redact the sensitive spans. They are never written to disk by
PiiI and never transmitted.

## What PiiI sends over the network

PiiI makes exactly **one** kind of outbound request:

- **First-run model download.** On first use, the name/address detection model
  weights are downloaded once from the Hugging Face CDN
  ([`onnx-community/multilang-pii-ner-ONNX`](https://huggingface.co/onnx-community/multilang-pii-ner-ONNX))
  and then cached by the browser. This is a `GET` for static model files. **None
  of your prompt text, files, or detected data is included in that request** — it
  carries no payload about you. After it completes, detection runs fully offline.

There are no other network requests. No prompt text, no detected values, no alias
map, no audit log, and no usage statistics ever leave your device.

## Third parties

PiiI does not integrate with any analytics, advertising, crash-reporting, or
data-broker service. The only third party contacted is the Hugging Face CDN, and
only to fetch the static, publicly hosted model weights described above.

## Data sharing and sale

PiiI does not and cannot share or sell your data: it never receives it. There is
nothing to share.

## Permissions and why they are needed

PiiI requests the minimum it needs, and no host permissions at all:

| Permission | Why |
|------------|-----|
| `storage` | Save your alias map, audit log, whitelist, and settings locally |
| `contextMenus` | Add the "always allow this term" action to the right-click menu |
| `activeTab` | Act on the tab you are using when you invoke a PiiI command |
| `alarms` | Schedule background health checks for the detection model |
| `offscreen` | Run the ONNX model (the service worker cannot load it) |

The content script is declared **only** for the supported chat domains. PiiI is
never injected into any other site.

## Your control

- **Pause protection** at any time from the toolbar popup; the extension then does
  nothing on any page.
- **Clear the audit log**, the **alias map**, and the **whitelist** from the popup.
- **Remove everything** by uninstalling the extension — this deletes all locally
  stored data with it.

## Children's privacy

PiiI is a developer/professional tool and is not directed at children. It
knowingly collects no personal data from anyone, regardless of age.

## Changes to this policy

Material changes will be reflected in the "Last updated" date above, and noted in
the release notes of the Chrome Web Store listing.

## Contact

Questions or concerns? Open an issue at
<https://github.com/JaySmith502/PiiI-public/issues>.
