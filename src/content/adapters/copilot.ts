import type { PlatformAdapter } from './types'
import { makeConversationChangeListener, firstMatch, lastMatch } from './shared'

function getInputElement(): HTMLElement | null {
  const el = firstMatch([
    'textarea#searchbox',
    'textarea[name="q"]',
    'textarea',
    'div[contenteditable="true"]',
  ])
  if (el) return el
  // ponytail: one-shot isolated-world diagnostic — page-console probes run in the
  // page world and can't show what the content script sees. Remove once Copilot works.
  if (!copilotDiagLogged) {
    copilotDiagLogged = true
    const shadowHosts = [...document.querySelectorAll('*')].filter(e => (e as HTMLElement).shadowRoot).length
    console.warn('[PiiI] copilot DIAG (isolated world):', JSON.stringify({
      href: location.href,
      isTopFrame: window.top === window,
      textareas: document.querySelectorAll('textarea').length,
      contenteditables: document.querySelectorAll('[contenteditable="true"]').length,
      roleTextbox: document.querySelectorAll('[role="textbox"]').length,
      openShadowHosts: shadowHosts,
      iframes: document.querySelectorAll('iframe').length,
    }))
  }
  return null
}

let copilotDiagLogged = false

function getConversationId(): string {
  // Try URL query param first, then path segments
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('conversationId') ?? params.get('cid')
  if (fromQuery) return fromQuery

  const segments = window.location.pathname.split('/').filter(Boolean)
  if (segments.length > 0) return segments[segments.length - 1]

  // ponytail: stable id for new chats — see chatgpt.ts
  return `copilot:${window.location.pathname}`
}

const onConversationChange = makeConversationChangeListener(getConversationId)

export const copilotAdapter: PlatformAdapter = {
  id: 'copilot',
  getInputElement,
  getConversationId,
  onConversationChange,
  getResponseElement(): HTMLElement | null {
    return lastMatch('[data-testid="assistant-message"], .assistant-message')
  },
}
