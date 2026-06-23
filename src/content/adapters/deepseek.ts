import type { PlatformAdapter } from './types'
import { makeConversationChangeListener, firstMatch, lastMatch } from './shared'

function getInputElement(): HTMLElement | null {
  const el = firstMatch([
    'textarea#chat-input',
    'textarea',
    'div[contenteditable="true"]',
  ])
  if (!el) console.warn('[PiiI] deepseek: no input element matched any selector')
  return el
}

function getConversationId(): string {
  const segments = window.location.pathname.split('/').filter(Boolean)
  if (segments.length > 0) return segments[segments.length - 1]
  // ponytail: stable id for new chats — see chatgpt.ts
  return `deepseek:${window.location.pathname}`
}

const onConversationChange = makeConversationChangeListener(getConversationId)

export const deepseekAdapter: PlatformAdapter = {
  id: 'deepseek',
  getInputElement,
  getConversationId,
  onConversationChange,
  // Deepseek's send control is an unlabelled `<div role="button">` with no testid
  // or aria-label — only the design-system class identifies it. The round primary
  // button in the composer is the send button.
  sendButtonSelector: '.ds-button--primary.ds-button--circle[role="button"]',
  getResponseElement(): HTMLElement | null {
    return lastMatch('.ds-markdown, [class*="markdown"]')
  },
}
