// Generic send/submit control match. Substring + case-insensitive so it covers
// send-button / submit-button testids and "Send"/"Submit message" labels across
// platforms. Adapters whose control has no semantic hook (Deepseek) override via
// adapter.sendButtonSelector.
export const DEFAULT_SEND_BUTTON =
  'button[data-testid="send-button"], button[data-testid="submit-button"], ' +
  'button[aria-label*="send" i], button[aria-label*="submit" i], button[type="submit"]'

export function interceptSubmit(
  inputEl: HTMLElement,
  onSubmitIntent: () => void,
  // Returns true when this event is our OWN programmatic send (triggerNativeSubmit).
  // Checked before any preventDefault so the event passes through to the platform.
  shouldSkip: () => boolean,
  sendButtonSelector: string = DEFAULT_SEND_BUTTON,
): () => void {
  // ponytail: listen at document capture, not on inputEl. React attaches its
  // capture handlers on the root container (above inputEl), so an element-level
  // capture listener fires AFTER React has already submitted. document is the
  // top of the capture phase, so it wins. stopImmediatePropagation blocks
  // React + any sibling listeners on the same node.
  const SEND_BUTTON = sendButtonSelector

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey) return
    // Gate on the event path, not document.activeElement. Rich editors (Lexical/
    // ProseMirror on Deepseek/Perplexity) put the caret on a descendant of inputEl,
    // and Copilot's composer lives in a shadow root where activeElement only ever
    // reports the shadow host — both make `activeElement === inputEl` false even
    // though focus is inside the composer. composedPath() crosses shadow boundaries
    // and includes ancestors, matching the same subtree that keyup highlights use.
    if (!e.composedPath().includes(inputEl)) return
    if (shouldSkip()) return // our own send — let it through natively
    e.preventDefault()
    e.stopImmediatePropagation()
    onSubmitIntent()
  }
  document.addEventListener('keydown', onKeydown, true)

  // Delegate the send-button click too — the button may not exist when this
  // runs, and may be re-rendered, so match at click time rather than caching it.
  const onClick = (e: MouseEvent) => {
    // composedPath so a send button inside a shadow root is still matched —
    // e.target is retargeted to the host there, so closest() alone misses it.
    const onSendButton = e.composedPath().some(
      n => n instanceof Element && n.matches(SEND_BUTTON)
    )
    if (onSendButton) {
      if (shouldSkip()) return // our own send — let it through natively
      e.preventDefault()
      e.stopImmediatePropagation()
      onSubmitIntent()
    }
  }
  document.addEventListener('click', onClick, true)

  return () => {
    document.removeEventListener('keydown', onKeydown, true)
    document.removeEventListener('click', onClick, true)
  }
}
