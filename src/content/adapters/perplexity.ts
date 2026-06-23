import type { PlatformAdapter } from './types'
import { makeConversationChangeListener, firstMatch, lastMatch } from './shared'

function getInputElement(): HTMLElement | null {
  const el = firstMatch([
    'textarea[placeholder]',
    'textarea',
    'div[contenteditable="true"]',
  ])
  if (!el) console.warn('[PiiI] perplexity: no input element matched any selector')
  return el
}

function getConversationId(): string {
  // Perplexity uses /search/<id> style URLs
  const match = window.location.pathname.match(/^\/search\/([^/]+)/)
  if (match) return match[1]

  const segments = window.location.pathname.split('/').filter(Boolean)
  if (segments.length > 0) return segments[segments.length - 1]

  // ponytail: stable id for new chats — see chatgpt.ts
  return `perplexity:${window.location.pathname}`
}

const onConversationChange = makeConversationChangeListener(getConversationId)

export const perplexityAdapter: PlatformAdapter = {
  id: 'perplexity',
  getInputElement,
  getConversationId,
  onConversationChange,
  getResponseElement(): HTMLElement | null {
    return lastMatch('.prose, [data-testid="answer-section"]')
  },
}
