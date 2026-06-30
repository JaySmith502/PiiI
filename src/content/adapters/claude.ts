import type { PlatformAdapter } from './types'
import { makeConversationChangeListener, firstMatch } from './shared'

function getInputElement(): HTMLElement | null {
  const el = firstMatch([
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"]',
  ])
  return el
}

function getConversationId(): string {
  const match = window.location.pathname.match(/^\/chat\/([^/]+)/)
  // ponytail: stable id for unsaved/new chats. Date.now() returned a fresh
  // value every call, so the conversation-change detector saw a "change" on
  // every title mutation and kept tearing down the input hook — nothing
  // flagged on a brand-new chat. Pathname is stable until the chat is saved.
  return match ? match[1] : `claude:${window.location.pathname}`
}

const onConversationChange = makeConversationChangeListener(getConversationId)

export const claudeAdapter: PlatformAdapter = {
  id: 'claude',
  getInputElement,
  getConversationId,
  onConversationChange,
  getResponseElement(): HTMLElement | null {
    return firstMatch([
      '[data-is-streaming="true"]',
      '.font-claude-message:last-of-type',
    ])
  },
}
