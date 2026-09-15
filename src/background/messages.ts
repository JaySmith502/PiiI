import type { Detection, PlatformId, AuditEntry } from '../types'
import type { ModelStatus } from './modelStatus'

// Messages sent from an extension page or content script → service worker
export type ContentToBackground =
  | { type: 'PING' }
  | { type: 'RUN_NER'; text: string; conversationId: string }
  | { type: 'GET_ALIAS_MAP'; conversationId: string }
  | { type: 'SET_ALIAS_MAP'; conversationId: string; platform: PlatformId; aliases: Record<string, string> }
  | { type: 'LOG_AUDIT'; entry: AuditEntry }
  | { type: 'GET_SETTINGS' }
  | { type: 'GET_WHITELIST' }
  // Model health (popup): read the current state, or ask for another load attempt.
  | { type: 'GET_MODEL_STATUS' }
  | { type: 'RETRY_MODEL' }

// Responses from service worker → content script
export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string }

export type NerResponse = { ok: true; detections: Detection[]; dropped?: number } | { ok: false; error: string }

// Service worker → offscreen document (ML inference). Reply is a NerResponse
// for OFFSCREEN_NER; OFFSCREEN_RETRY answers with a NerResponse-shaped ack.
export type OffscreenRequest =
  | { type: 'OFFSCREEN_NER'; text: string }
  | { type: 'OFFSCREEN_RETRY' }

// Reply to GET_MODEL_STATUS / RETRY_MODEL (popup → service worker)
export type ModelStatusResponse = { ok: true; data: ModelStatus } | { ok: false; error: string }

// Messages sent TO the content script — from the popup and the service worker.
export type ContentInboundMessage =
  | { type: 'GET_CURRENT_ALIASES' }
  | { type: 'GET_LAST_RIGHTCLICKED_TERM' }
  | { type: 'GET_SELECTED_TERM' }

// Reply to GET_CURRENT_ALIASES (popup → content)
export type CurrentAliasesResponse =
  | { ok: true; conversationId: string; aliases: Record<string, string> }
  | { ok: false }

// Reply to GET_LAST_RIGHTCLICKED_TERM (service worker → content)
export type RightClickedTermResponse = { term: string | null }

// Reply to GET_SELECTED_TERM (service worker → content, hotkey path)
export type SelectedTermResponse = { term: string | null }
