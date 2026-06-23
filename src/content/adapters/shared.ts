/** First element matched by the selectors, tried in order; null if none match. */
export function firstMatch(
  selectors: string[],
  root: Pick<ParentNode, 'querySelector'> = document,
): HTMLElement | null {
  for (const sel of selectors) {
    const el = root.querySelector(sel)
    if (el) return el as HTMLElement
  }
  return null
}

/** Last element matched by the selector (the most recent message); null if none. */
export function lastMatch(
  selector: string,
  root: Pick<ParentNode, 'querySelectorAll'> = document,
): HTMLElement | null {
  const els = root.querySelectorAll(selector)
  return (els[els.length - 1] as HTMLElement | undefined) ?? null
}

/**
 * Creates an onConversationChange listener that detects navigation via:
 * - popstate events
 * - history.pushState / replaceState patches (SPA navigation)
 * - MutationObserver on <title> element
 */
export function makeConversationChangeListener(
  getConversationId: () => string
): (callback: (id: string) => void) => () => void {
  return (callback) => {
    let currentId = getConversationId()

    const check = () => {
      const newId = getConversationId()
      if (newId !== currentId) {
        currentId = newId
        callback(newId)
      }
    }

    // popstate fires on back/forward navigation
    window.addEventListener('popstate', check)

    // Patch pushState/replaceState to catch SPA navigation
    const originalPushState = history.pushState.bind(history)
    const originalReplaceState = history.replaceState.bind(history)
    history.pushState = (...args) => { originalPushState(...args); check() }
    history.replaceState = (...args) => { originalReplaceState(...args); check() }

    // MutationObserver on <title> as a supplementary signal
    const titleEl = document.querySelector('title')
    let observer: MutationObserver | null = null
    if (titleEl) {
      observer = new MutationObserver(check)
      observer.observe(titleEl, { subtree: true, characterData: true, childList: true })
    }
    // ponytail: no documentElement fallback — too expensive; popstate+pushState patch covers SPA

    return () => {
      window.removeEventListener('popstate', check)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      observer?.disconnect()
    }
  }
}
