import { pipeline, env } from '@huggingface/transformers'
import type { Detection } from '../types'
import type { OffscreenRequest, NerResponse } from '../background/messages'

env.allowLocalModels = false
// Serve ort-wasm runtime files from the extension itself (dist/ort-wasm/) so the
// dynamic import() of the .mjs glue file is from 'self' and passes CSP script-src.
// The files are copied from node_modules by the ortBuildPlugin in vite.config.ts.
// @ts-expect-error nested wasm config valid at runtime
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('ort-wasm/')

const MODEL = 'onnx-community/multilang-pii-ner-ONNX'

// Labels emitted by onnx-community/multilang-pii-ner-ONNX (ai4privacy label set),
// mapped to our detection categories.
const ENTITY_TO_CATEGORY: Record<string, string> = {
  // names
  GIVENNAME: 'name', SURNAME: 'name', TITLE: 'name',
  // contact
  EMAIL: 'email', TELEPHONENUM: 'phone',
  // government / financial IDs
  SOCIALNUM: 'ssn', TAXNUM: 'ssn',
  CREDITCARDNUMBER: 'credit_card',
  IDCARDNUM: 'account_id', PASSPORTNUM: 'account_id', DRIVERLICENSENUM: 'account_id',
  // dates
  DATE: 'date',
  // address parts
  STREET: 'address', BUILDINGNUM: 'address', CITY: 'address', ZIPCODE: 'address',
}

// Recognised by the model but intentionally not masked (low sensitivity / no
// matching category). Listed so they're skipped silently instead of warned.
const IGNORED_ENTITIES = new Set(['AGE', 'GENDER', 'SEX', 'TIME'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class NerPipeline {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static instance: any | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static loading: Promise<any> | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async get(): Promise<any> {
    if (this.instance) return this.instance
    if (this.loading) return this.loading
    // ponytail: aggregation_strategy must be passed at CALL time, not here —
    // pipeline() only takes model-load options, so it was silently ignored and
    // the pipeline ran in 'none' mode (raw subword tokens, `.entity` field) with
    // no `.entity_group`, dropping every detection.
    this.loading = pipeline('token-classification', MODEL)
      .then(p => { this.instance = p; this.loading = null; return p })
      .catch(err => { this.loading = null; throw err })
    return this.loading
  }
}

// Warm up on document load — model download starts as soon as offscreen doc is created
NerPipeline.get().catch(err => console.warn('[PiiI offscreen] warm-up failed:', err))

// The NER model sometimes tags only part of a word — "Spring" of "Springfield" —
// leaving the overlay cut mid-word. Expand a span outward over adjacent word
// characters to capture the whole word. It stops at whitespace, comma and period,
// so it never reaches into the next word: full names and two-word city names stay
// as separate tokens (coalesceMultipart joins those deliberately, across spaces).
// Expansion only grows a span outward over non-boundary chars, so already-correct
// spans (emails, "4111 1111 1111 1111") — bounded by whitespace/punctuation — are
// left untouched.
const WORD_BOUNDARY = /[\s,.]/
function snapToWord(span: [number, number], text: string): [number, number] {
  let [start, end] = span
  while (start > 0 && !WORD_BOUNDARY.test(text[start - 1])) start--
  while (end < text.length && !WORD_BOUNDARY.test(text[end])) end++
  return [start, end]
}

// Categories built from multiple adjacent model tokens: a name is GIVENNAME +
// SURNAME (distinct entity groups, so 'simple' aggregation never joins them), an
// address is STREET + BUILDINGNUM + CITY + ZIPCODE. Subword splits ("Smalley" →
// two SURNAME tokens) land here too. Without this, one human name becomes
// [PERSON_1] [PERSON_2][PERSON_3] — three aliases for one entity.
const MULTIPART_CATEGORIES = new Set(['name', 'address'])

// Merge adjacent same-category detections separated only by whitespace into one
// span, so "John Smalley" → a single name. Overlaps are left for mergeDetections;
// only whitespace gaps are bridged so distinct values (e.g. two emails) never fuse.
function coalesceMultipart(dets: Detection[], text: string): Detection[] {
  if (dets.length < 2) return dets
  const sorted = [...dets].sort((a, b) => a.span[0] - b.span[0])
  const out: Detection[] = []
  let cur = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    const gap = text.slice(cur.span[1], next.span[0])
    const mergeable =
      cur.category === next.category &&
      MULTIPART_CATEGORIES.has(cur.category) &&
      next.span[0] >= cur.span[1] && // not overlapping
      /^\s?$/.test(gap)              // empty or a single whitespace char between parts
    if (mergeable) {
      const span: [number, number] = [cur.span[0], next.span[1]]
      cur = { ...cur, span, text: text.slice(span[0], span[1]), confidence: Math.min(cur.confidence, next.confidence) }
    } else {
      out.push(cur)
      cur = next
    }
  }
  out.push(cur)
  return out
}

interface NerEntity {
  entity_group: string
  score: number
  word: string
  // 'simple' aggregation does NOT return character offsets — we locate the
  // word in the source text ourselves (see below).
  start?: number
  end?: number
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'OFFSCREEN_NER') return false

  const { text } = msg as OffscreenRequest
  if (!text.trim()) {
    sendResponse({ ok: true, detections: [] } satisfies NerResponse)
    return false
  }

  NerPipeline.get()
    // 'simple' aggregation merges subword tokens into whole entities
    // ("Sarah Chen" → one PERSON) and yields the `entity_group` field.
    .then(ner => ner(text, { aggregation_strategy: 'simple' }) as Promise<NerEntity[]>)
    .then(raw => {
      const detections: Detection[] = []
      // Walk a cursor so repeated words (e.g. two names) resolve to distinct
      // spans in order rather than all matching the first occurrence.
      let searchFrom = 0
      for (const entity of raw) {
        if (IGNORED_ENTITIES.has(entity.entity_group)) continue
        const category = ENTITY_TO_CATEGORY[entity.entity_group]
        if (!category) {
          console.warn(`[PiiI offscreen] unknown entity label: ${entity.entity_group}`)
          continue
        }

        // 'simple' aggregation gives the decoded word but no offsets — find it.
        const word = entity.word.trim()
        let start = entity.start
        let end = entity.end
        if (typeof start !== 'number' || typeof end !== 'number') {
          const idx = word ? text.indexOf(word, searchFrom) : -1
          if (idx === -1) {
            console.warn(`[PiiI offscreen] could not locate "${word}" in text`)
            continue
          }
          start = idx
          end = idx + word.length
          searchFrom = end
        }

        detections.push({
          span: [start, end],
          text: text.slice(start, end),
          category,
          confidence: Math.round(entity.score * 100) / 100,
          alias: '',
        })
      }
      // Snap each span to full-word boundaries first, then join multi-part entities.
      const snapped = detections.map(d => {
        const span = snapToWord(d.span, text)
        return span[0] === d.span[0] && span[1] === d.span[1]
          ? d
          : { ...d, span, text: text.slice(span[0], span[1]) }
      })
      sendResponse({ ok: true, detections: coalesceMultipart(snapped, text) } satisfies NerResponse)
    })
    .catch(err => sendResponse({ ok: false, error: String(err) } satisfies NerResponse))

  return true // async response
})
