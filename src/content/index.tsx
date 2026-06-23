import { getAdapter } from './adapters'
import type { PlatformAdapter } from './adapters'
import { runDetection, combineDetections } from './detection'
import { classifyAction, selectReviewDetections } from './submitFlow'
import { whitelistFromChange } from '../background/storage'
import { HighlightManager } from './highlight'
import type {
  NerResponse,
  ContentInboundMessage,
  CurrentAliasesResponse,
  RightClickedTermResponse,
} from '../background/messages'
import { sendToBackground } from './utils'
import { assignAliases } from './aliases'
import { ReviewManager } from './review'
import type { Decision } from './review'
import { interceptSubmit, DEFAULT_SEND_BUTTON } from './submit'
import { substituteText } from './substitute'
import { logAuditEntry } from './audit'
import { DealiasEngine } from './dealias'
import { setupFileScanner } from './fileScanner'
import type { Detection, AliasMap, WhitelistEntry } from '../types'

let lastRightClickedTerm: string | null = null

function getInputText(el: HTMLElement): string {
  if (el.tagName === 'TEXTAREA') return (el as HTMLTextAreaElement).value
  return el.innerText // contenteditable
}

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: T) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

function waitForInput(adapter: PlatformAdapter, cb: (el: HTMLElement) => void): () => void {
  const el = adapter.getInputElement()
  if (el) {
    cb(el)
    return () => {}
  }

  const observer = new MutationObserver(() => {
    const found = adapter.getInputElement()
    if (found) {
      observer.disconnect()
      cb(found)
    }
  })
  // Watch attributes too: some editors (Grok/TipTap) mount on an existing node
  // by toggling contenteditable/class/role rather than inserting a new node —
  // a childList-only observer never re-checks and misses the input.
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['contenteditable', 'class', 'role'],
  })
  // ponytail: no fixed bail-out. The composer can hydrate arbitrarily late on
  // slow SPAs (Grok mounts it well after load, past any deadline we'd pick), and
  // a timeout that fired first left us permanently unhooked. The observer
  // self-disconnects on the first match; onConversationChange/unload also tear it
  // down — so no leak on a supported host. Add a generous cap only if an
  // unsupported host is ever seen spinning it forever.
  return () => observer.disconnect()
}

const adapter = getAdapter()
// ponytail: one-line load probe — distinguishes "script never injected" from
// "injected but adapter found no input". Shows in the PAGE tab console, not offscreen.
console.info('[PiiI] loaded on', window.location.hostname, '— adapter:', adapter?.id ?? 'NONE (unsupported host)')
if (adapter) {
  // Shadow to give TypeScript a non-null constant for closures
  const safeAdapter = adapter
  const highlighter = new HighlightManager()
  const dealiasEngine = new DealiasEngine()
  const cleanupFileScanner = setupFileScanner(() => whitelist)
  let cleanupInput: (() => void) | null = null
  let whitelist = new Set<string>()
  let latestText = ''
  let currentRunAndUpdate: (() => void) | null = null

  // Load whitelist from storage on init
  sendToBackground<{ ok: boolean; data: WhitelistEntry[] }>({ type: 'GET_WHITELIST' })
    .then(r => {
      if (r.ok && r.data) whitelist = new Set(r.data.map((e: WhitelistEntry) => e.term))
    })
    .catch(() => {})

  function setupInput(inputEl: HTMLElement) {
    cleanupInput?.()

    const sendSelector = safeAdapter.sendButtonSelector ?? DEFAULT_SEND_BUTTON

    highlighter.mount(inputEl)

    // Holds the fully merged (regex + NER) aliased set, keyed to the exact text
    // it was computed for. The submit guard only trusts it when text matches;
    // otherwise it falls back to synchronous regex so it never races the pipeline.
    let latestAliased: { text: string; detections: Detection[] } | null = null

    const reviewManager = new ReviewManager()

    const runAndUpdate = () => {
      const text = getInputText(inputEl)
      latestText = text

      // Phase A: immediate regex highlights
      const regexDetections = runDetection(text, whitelist)
      highlighter.update(text, regexDetections, (term) => { lastRightClickedTerm = term })

      if (!text.trim()) {
        latestAliased = null
        return
      }

      // Phase B: async NER — fire and merge when ready
      sendToBackground<NerResponse>({ type: 'RUN_NER', text, conversationId: safeAdapter.getConversationId() })
        .then(response => {
          // Discard if user has typed more since this NER call started
          if (latestText !== text) return

          if (!response.ok) {
            console.warn('[PiiI] NER error:', response.error)
            return
          }

          const merged = combineDetections(regexDetections, response.detections, whitelist)

          // Assign aliases so highlights show [PERSON_1] style labels
          assignAliases(merged, safeAdapter.getConversationId(), safeAdapter.id)
            .then(aliased => {
              if (latestText !== text) return
              latestAliased = { text, detections: aliased }
              highlighter.update(text, aliased, (term) => { lastRightClickedTerm = term })
            })
            .catch(err => {
              console.warn('[PiiI] alias assignment failed:', err)
              latestAliased = { text, detections: merged }
              highlighter.update(text, merged, (term) => { lastRightClickedTerm = term })
            })
        })
        .catch(err => {
          // Service worker may be asleep; regex-only aliases remain from Phase A½
          console.warn('[PiiI] NER request failed:', err)
        })
    }
    currentRunAndUpdate = runAndUpdate

    const debouncedRun = debounce(runAndUpdate, 300)
    // Both paste and keyup use the same debounced runner.
    // setTimeout 0 on paste: lets the DOM update before we read the text.
    // ponytail: one debounced fn for both events — concurrent NER calls prevented
    const onPaste = () => setTimeout(debouncedRun, 0)

    // Skip-flag prevents re-intercepting our own synthetic submit keydown
    let skipNextSubmit = false

    const handleSubmitIntent = async () => {
      const text = getInputText(inputEl)

      const detections = await selectReviewDetections({
        text,
        cached: latestAliased,
        whitelist,
        detect: runDetection,
        alias: d => assignAliases(d, safeAdapter.getConversationId(), safeAdapter.id),
      })

      if (detections.length === 0) {
        // No PII detected — pass through natively
        triggerNativeSubmit()
        return
      }

      reviewManager.show(
        detections,
        async (decisions: Decision[]) => {
          reviewManager.hide()
          await substituteText(inputEl, text, decisions)

          const accepted = decisions.filter(d => d.accepted)
          const action = classifyAction(decisions)

          await logAuditEntry(
            safeAdapter.id,
            [...new Set(decisions.map(d => d.detection.category))],
            action,
            accepted.length,
          )

          triggerNativeSubmit()

          // Start de-aliasing the response if any aliases were accepted
          if (accepted.length > 0) {
            const convId = safeAdapter.getConversationId()
            sendToBackground<{ ok: boolean; data: AliasMap | null }>({ type: 'GET_ALIAS_MAP', conversationId: convId })
              .then(r => {
                if (!r.ok || !r.data) return
                const map = r.data as AliasMap
                let n = 0
                const poll = setInterval(() => {
                  const el = safeAdapter.getResponseElement()
                  if (el) { clearInterval(poll); dealiasEngine.start(el, map) }
                  else if (++n >= 50) clearInterval(poll) // give up after 5s
                }, 100)
              })
              .catch(() => {})
          }
        },
        () => {
          // User chose Send Original
          reviewManager.hide()
          logAuditEntry(safeAdapter.id, [], 'sent_original', 0)
          triggerNativeSubmit()
        },
        () => {
          // User chose Cancel — close, send nothing, leave text in the input
          reviewManager.hide()
        },
      )
    }

    function triggerNativeSubmit() {
      skipNextSubmit = true
      // Fallback: reset flag after 500ms in case synthetic event is not consumed
      setTimeout(() => { skipNextSubmit = false }, 500)

      // Prefer clicking the send button — produces a trusted event
      const sendButton = document.querySelector<HTMLElement>(sendSelector)
      if (sendButton) {
        sendButton.click()
      } else {
        // Fallback: synthetic Enter keydown (isTrusted=false, may not work on all platforms)
        // ponytail: most React-based AI platforms process this; add per-platform adapter method in Phase 5 if needed
        inputEl.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        )
      }

      // The input empties after sending but fires no keyup, so stale highlight
      // boxes would stick on screen. Clear them now, then resync once the
      // platform has processed the send (re-reads the real input state).
      highlighter.update('', [])
      latestAliased = null
      setTimeout(runAndUpdate, 150)
    }

    inputEl.addEventListener('paste', onPaste)
    inputEl.addEventListener('keyup', debouncedRun)

    // One-shot consume: when triggerNativeSubmit set the flag, let exactly one
    // send event pass through, then clear it.
    const cleanupSubmit = interceptSubmit(inputEl, handleSubmitIntent, () => {
      if (skipNextSubmit) { skipNextSubmit = false; return true }
      return false
    }, sendSelector)

    // Run once immediately in case there's already text
    runAndUpdate()

    cleanupInput = () => {
      inputEl.removeEventListener('paste', onPaste)
      inputEl.removeEventListener('keyup', debouncedRun)
      cleanupSubmit()
      reviewManager.hide()
      currentRunAndUpdate = null
      highlighter.unmount()
    }
  }

  let cleanupWait = waitForInput(safeAdapter, setupInput)

  const cleanupConvChange = safeAdapter.onConversationChange(() => {
    cleanupWait()
    cleanupInput?.()
    cleanupInput = null
    currentRunAndUpdate = null
    latestText = ''
    dealiasEngine.stop()
    // Small delay: SPA may not have new input immediately after URL change
    setTimeout(() => {
      // reassign so the unload handler's closure reads the latest cleanup ref
      cleanupWait = waitForInput(safeAdapter, setupInput)
    }, 300)
  })

  // Update whitelist and re-run detection immediately when storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    const entries = whitelistFromChange(area, changes)
    if (!entries) return
    whitelist = new Set(entries.map(e => e.term))
    if (latestText && currentRunAndUpdate) currentRunAndUpdate()
  })

  window.addEventListener('unload', () => {
    cleanupWait()
    cleanupInput?.()
    cleanupConvChange()
    dealiasEngine.stop()
    cleanupFileScanner()
  })
}

// Respond to popup and service-worker queries
chrome.runtime.onMessage.addListener((msg: ContentInboundMessage, _sender, sendResponse) => {
  if (msg.type === 'GET_CURRENT_ALIASES') {
    const convId = adapter?.getConversationId() ?? ''
    if (!convId) { sendResponse({ ok: false } satisfies CurrentAliasesResponse); return false }
    sendToBackground<{ ok: boolean; data: AliasMap | null }>({ type: 'GET_ALIAS_MAP', conversationId: convId })
      .then(r => sendResponse(
        (r.ok && r.data
          ? { ok: true, conversationId: convId, aliases: r.data.aliases }
          : { ok: false }) satisfies CurrentAliasesResponse
      ))
      .catch(() => sendResponse({ ok: false } satisfies CurrentAliasesResponse))
    return true // async
  }
  if (msg.type === 'GET_LAST_RIGHTCLICKED_TERM') {
    sendResponse({ term: lastRightClickedTerm ?? null } satisfies RightClickedTermResponse)
    lastRightClickedTerm = null  // consumed - prevents stale re-use
    return false
  }
  return false
})
