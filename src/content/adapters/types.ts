import type { PlatformId } from '../../types'

export interface PlatformAdapter {
  id: PlatformId
  /** Returns the active prompt input element, or null if not found */
  getInputElement(): HTMLElement | null
  /** Returns a stable conversation ID string for the current conversation */
  getConversationId(): string
  /** Called when the URL changes or new conversation detected — returns cleanup fn */
  onConversationChange(callback: (conversationId: string) => void): () => void
  /** Returns the AI response container element, or null if not yet rendered */
  getResponseElement(): HTMLElement | null
  /**
   * CSS selector for the send/submit control, when the generic default can't
   * match it (e.g. Deepseek's unlabelled `<div role="button">`). Falls back to
   * DEFAULT_SEND_BUTTON in submit.ts when omitted.
   */
  sendButtonSelector?: string
}
