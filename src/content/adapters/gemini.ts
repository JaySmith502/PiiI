import type { PlatformAdapter } from './types'
import { makeConversationChangeListener, firstMatch, lastMatch } from './shared'

function getInputElement(): HTMLElement | null {
  const el = firstMatch([
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"]',
  ])
  if (!el) console.warn('[PiiI] gemini: no input element matched any selector')
  return el
}

function getConversationId(): string {
  // Gemini uses paths like /app/<id>
  const match = window.location.pathname.match(/^\/app\/([^/]+)/)
  // ponytail: stable id for new chats — see chatgpt.ts
  return match ? match[1] : `gemini:${window.location.pathname}`
}

const onConversationChange = makeConversationChangeListener(getConversationId)

export const geminiAdapter: PlatformAdapter = {
  id: 'gemini',
  getInputElement,
  getConversationId,
  onConversationChange,
  getResponseElement(): HTMLElement | null {
    return lastMatch('message-content')
  },
}
