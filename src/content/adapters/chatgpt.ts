import type { PlatformAdapter } from './types'
import { makeConversationChangeListener, firstMatch, lastMatch } from './shared'

function getInputElement(): HTMLElement | null {
  const el = firstMatch([
    '#prompt-textarea',
    '[data-id="prompt-textarea"]',
    'div[contenteditable="true"]',
  ])
  return el
}

function getConversationId(): string {
  const match = window.location.pathname.match(/^\/c\/([^/]+)/)
  // ponytail: stable id for new chats — Date.now() caused spurious
  // conversation-change teardowns that unhooked detection.
  return match ? match[1] : `chatgpt:${window.location.pathname}`
}

const onConversationChange = makeConversationChangeListener(getConversationId)

export const chatgptAdapter: PlatformAdapter = {
  id: 'chatgpt',
  getInputElement,
  getConversationId,
  onConversationChange,
  getResponseElement(): HTMLElement | null {
    const last = lastMatch('[data-message-author-role="assistant"]')
    return (last?.querySelector('.markdown') as HTMLElement | null) ?? last
  },
}
