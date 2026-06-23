import type { Decision } from './review'

export async function substituteText(
  inputEl: HTMLElement,
  text: string,
  decisions: Decision[],
): Promise<void> {
  const accepted = decisions.filter(d => d.accepted)
  if (accepted.length === 0) return

  // Sort descending by span start so replacements don't cause offset drift
  const sorted = [...accepted].sort((a, b) => b.detection.span[0] - a.detection.span[0])

  let result = text
  for (const decision of sorted) {
    const [start, end] = decision.detection.span
    result = result.slice(0, start) + decision.alias + result.slice(end)
  }

  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    // React/Vue override the value setter and track the last value THEY set, so a
    // plain `el.value = x` updates their tracker too — the dispatched input event
    // then looks like a no-op and the framework keeps its old state, sending the
    // ORIGINAL text. Calling the native prototype setter updates the DOM value
    // without touching the framework's tracker, so the input event registers as a
    // genuine change and state syncs to the redacted text.
    const proto = inputEl.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    nativeSetter?.call(inputEl, result)
    inputEl.dispatchEvent(new Event('input', { bubbles: true }))
  } else {
    // contenteditable rich editors (Lexical on Perplexity, ProseMirror on
    // Claude/ChatGPT) keep their own internal document model and ignore a direct
    // innerText write — on submit they re-serialize from that model and send the
    // ORIGINAL text. Replace the content through the editor's real input pipeline:
    // select everything, then execCommand('insertText') fires the beforeinput/
    // input events the editor listens for, so its model updates to the redacted
    // text. execCommand is deprecated but the only reliable cross-editor injection
    // in Chromium (our only target), and it dispatches its own input event.
    inputEl.focus()
    const sel = window.getSelection()
    if (sel) {
      const range = document.createRange()
      range.selectNodeContents(inputEl)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    // Lexical keeps its OWN selection state and syncs it from the DOM's async
    // `selectionchange` event. If we insert in the same tick, Lexical still holds a
    // stale selection, reconciles against it and reverts the DOM to the original
    // (execCommand returns true but nothing sticks — the observed bug). Yield one
    // task so Lexical's selection sync runs first, then insert into the real range.
    await new Promise(r => setTimeout(r, 0))
    document.execCommand('insertText', false, result)
  }
}
