import type { PlatformAdapter } from './types'
import { makeConversationChangeListener, firstMatch, lastMatch } from './shared'

function getInputElement(): HTMLElement | null {
  // ponytail: Grok is shelved as unsupported — its composer is unreachable from
  // the content script's isolated world (see known-issues). Selectors kept
  // best-effort; adapter stays so detection turns on if Grok's DOM ever changes.
  return firstMatch([
    '.ProseMirror[contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    'div[contenteditable="true"]',
  ])
}

function getConversationId(): string {
  const segments = window.location.pathname.split('/').filter(Boolean)
  // e.g. /i/grok or /chat/<id>
  const id = segments[segments.length - 1]
  if (id && id !== 'grok') return id
  // ponytail: stable id for new chats — see chatgpt.ts
  return `grok:${window.location.pathname}`
}

const onConversationChange = makeConversationChangeListener(getConversationId)

export const grokAdapter: PlatformAdapter = {
  id: 'grok',
  getInputElement,
  getConversationId,
  onConversationChange,
  getResponseElement(): HTMLElement | null {
    return lastMatch('[data-testid="grok-message"], .grok-response')
      ?? (document.querySelector('.response-content') as HTMLElement | null)
  },
}
