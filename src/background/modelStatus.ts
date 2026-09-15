// Tracks whether the on-device NER model is usable.
//
// Why this exists: model loading happens in the offscreen document, and the
// only place its failure used to surface was the extension's own console. A
// customer on a locked-down network (Hugging Face CDN blocked) saw an extension
// that simply never highlighted anything, with no explanation and no way to
// recover. The status is now reported to the service worker and shown in the
// popup with a retry action.

export type ModelState = 'idle' | 'loading' | 'ready' | 'error'

export interface ModelStatus {
  state: ModelState
  /** Human-readable failure reason; only set when state === 'error'. */
  error?: string
}

/** Reports sent offscreen -> service worker as the pipeline starts/finishes. */
export type ModelStatusReport =
  | { type: 'MODEL_LOADING' }
  | { type: 'MODEL_READY' }
  | { type: 'MODEL_ERROR'; error: string }

export const INITIAL_MODEL_STATUS: ModelStatus = { state: 'idle' }

const STATUS_REPORT_TYPES = new Set(['MODEL_LOADING', 'MODEL_READY', 'MODEL_ERROR'])

export function isModelStatusReport(message: unknown): message is ModelStatusReport {
  if (!message || typeof message !== 'object') return false
  return STATUS_REPORT_TYPES.has((message as { type?: string }).type ?? '')
}

// Pure transition: same report sequence always yields the same status, so the
// popup's rendering can be reasoned about (and unit tested) without a browser.
export function reduceModelStatus(_prev: ModelStatus, report: ModelStatusReport): ModelStatus {
  switch (report.type) {
    case 'MODEL_LOADING':
      return { state: 'loading' }
    case 'MODEL_READY':
      return { state: 'ready' }
    case 'MODEL_ERROR':
      return { state: 'error', error: report.error }
  }
}

// Latest known status. Module-level because the service worker is a single
// long-lived context that may be torn down at any time — a restart resets this
// to 'idle', and the offscreen document re-reports on its next load.
let current: ModelStatus = INITIAL_MODEL_STATUS

export function getModelStatus(): ModelStatus {
  return current
}

export function reportModelStatus(report: ModelStatusReport): ModelStatus {
  current = reduceModelStatus(current, report)
  return current
}
