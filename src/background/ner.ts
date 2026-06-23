import type { Detection } from '../types'
import type { OffscreenRequest, NerResponse } from './messages'

// Offscreen document handles NER — service workers cannot run onnxruntime-web
// because dynamic import() is disallowed in ServiceWorkerGlobalScope (HTML spec)
const OFFSCREEN_URL = chrome.runtime.getURL('offscreen.html')

// Serialised creation lock: set synchronously before any await so concurrent
// callers share the same promise rather than racing to createDocument()
let ensuring: Promise<void> | null = null

function ensureOffscreen(): Promise<void> {
  if (ensuring) return ensuring
  ensuring = _doEnsure().finally(() => { ensuring = null })
  return ensuring
}

async function _doEnsure(): Promise<void> {
  // getContexts available Chrome 116+; extension requires 120+
  const existing = await (chrome.runtime as unknown as {
    getContexts(f: object): Promise<{ documentUrl: string }[]>
  }).getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [OFFSCREEN_URL] })
  if (existing.length > 0) return
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: 'ML inference for PII named-entity recognition',
  })
}

export async function runNer(text: string): Promise<Detection[]> {
  if (!text.trim()) return []
  await ensureOffscreen()
  const resp = (await chrome.runtime.sendMessage(
    { type: 'OFFSCREEN_NER', text } satisfies OffscreenRequest
  )) as NerResponse | undefined
  if (!resp || !resp.ok) {
    throw new Error(resp && !resp.ok ? resp.error : 'offscreen NER failed')
  }
  return resp.detections
}

export function warmUp(): void {
  // Creating the offscreen doc triggers NerPipeline warm-up on its own load
  ensureOffscreen().catch(err => console.warn('[PiiI] offscreen init failed:', err))
}
