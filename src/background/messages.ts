import type { Detection, PlatformId, AuditEntry } from '../types'

// Messages sent from content script → service worker
export type ContentToBackground =
  | { type: 'PING' }
  | { type: 'RUN_NER'; text: string; conversationId: string }
  | { type: 'GET_ALIAS_MAP'; conversationId: string }
  | { type: 'SET_ALIAS_MAP'; conversationId: string; platform: PlatformId; aliases: Record<string, string> }
  | { type: 'LOG_AUDIT'; entry: AuditEntry }
  | { type: 'GET_SETTINGS' }
  | { type: 'GET_WHITELIST' }

// Responses from service worker → content script
export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string }

export type NerResponse = { ok: true; detections: Detection[] } | { ok: false; error: string }

// Service worker → offscreen document (ML inference). Reply is a NerResponse.
export type OffscreenRequest = { type: 'OFFSCREEN_NER'; text: string }

// Messages sent TO the content script — from the popup and the service worker.
export type ContentInboundMessage =
  | { type: 'GET_CURRENT_ALIASES' }
  | { type: 'GET_LAST_RIGHTCLICKED_TERM' }

// Reply to GET_CURRENT_ALIASES (popup → content)
export type CurrentAliasesResponse =
  | { ok: true; conversationId: string; aliases: Record<string, string> }
  | { ok: false }

// Reply to GET_LAST_RIGHTCLICKED_TERM (service worker → content)
export type RightClickedTermResponse = { term: string | null }
