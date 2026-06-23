import type { Detection } from '../types'
import type { Decision } from './review'

// The two decisions inside the submit flow, lifted out of content/index.tsx so
// they can be tested in isolation. Everything else in the flow (substitute,
// audit, native submit, dealias) is effectful glue and stays at the call site.

export type SubmitAction = 'accepted' | 'sent_original' | 'edited'

export function classifyAction(decisions: Decision[]): SubmitAction {
  const accepted = decisions.filter(d => d.accepted).length
  if (accepted === decisions.length) return 'accepted'
  if (accepted === 0) return 'sent_original'
  return 'edited'
}

// Pick the detections to put in front of the user. Reuse the full NER+regex
// aliased set only if it was computed for exactly this text; otherwise compute
// regex synchronously so the submit guard never races the async NER pipeline.
export async function selectReviewDetections(opts: {
  text: string
  cached: { text: string; detections: Detection[] } | null
  whitelist: Set<string>
  detect: (text: string, whitelist: Set<string>) => Detection[]
  alias: (detections: Detection[]) => Promise<Detection[]>
}): Promise<Detection[]> {
  const { text, cached, whitelist, detect, alias } = opts
  if (cached && cached.text === text) {
    return cached.detections.filter(d => d.alias)
  }
  const regex = detect(text, whitelist)
  if (regex.length === 0) return []
  return (await alias(regex)).filter(d => d.alias)
}
