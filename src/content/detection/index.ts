import type { Detection } from '../../types'
import { runRegexDetectors } from './regex'
import { mergeDetections } from './merge'

export function runDetection(text: string, whitelist: Set<string> = new Set()): Detection[] {
  if (!text) return []
  return combineDetections(runRegexDetectors(text), [], whitelist)
}

// Merge regex + NER detections and apply the whitelist over the whole set.
// The single source of truth for both scan paths (live chat input + file scan),
// which previously hand-wrote this same merge-then-filter sequence.
//
// Whitelist matching is case-insensitive: a term allowed as "Abbie" should also
// suppress "abbie"/"ABBIE", since product and brand names get typed with varied
// casing. Storage keeps the original casing for display; only the compare folds.
export function combineDetections(
  regex: Detection[],
  ner: Detection[],
  whitelist: Set<string> = new Set(),
): Detection[] {
  const merged = mergeDetections([...regex, ...ner])
  if (whitelist.size === 0) return merged
  const folded = new Set([...whitelist].map(t => t.toLowerCase()))
  return merged.filter(d => !folded.has(d.text.toLowerCase()))
}

// ponytail: remove or strip via build before prod
if (import.meta.env.DEV) {
  const TEST_TEXT =
    'Email me at test@example.com or call (555) 867-5309. My CC is 4532015112830366. API key: sk-abc123XYZ789verylongkeyhere'
  const results = runDetection(TEST_TEXT)
  console.assert(results.some((d) => d.category === 'email'), '[PiiI] detection: email missed')
  console.assert(results.some((d) => d.category === 'phone'), '[PiiI] detection: phone missed')
  console.assert(
    results.some((d) => d.category === 'credit_card'),
    '[PiiI] detection: credit_card missed'
  )
  console.assert(
    results.some((d) => d.category === 'api_key'),
    '[PiiI] detection: api_key missed'
  )
}
