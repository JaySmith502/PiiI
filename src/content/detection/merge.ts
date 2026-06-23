import type { Detection } from '../../types'

export function mergeDetections(detections: Detection[]): Detection[] {
  if (detections.length === 0) return []

  // Sort by start asc, then confidence desc (so higher-confidence wins ties)
  const sorted = [...detections].sort((a, b) =>
    a.span[0] !== b.span[0]
      ? a.span[0] - b.span[0]
      : b.confidence - a.confidence
  )

  const result: Detection[] = []
  let current = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (next.span[0] >= current.span[1]) {
      // No overlap — emit current, advance
      result.push(current)
      current = next
    } else {
      // Overlap: prefer the WIDER span — for a DLP tool, masking the larger
      // region is safer than leaving PII partially exposed (e.g. regex's full
      // "11-14-1982" beats NER's partial "11"). Tie → higher confidence.
      const currentWidth = current.span[1] - current.span[0]
      const nextWidth = next.span[1] - next.span[0]
      const currentWins =
        currentWidth > nextWidth ||
        (currentWidth === nextWidth && current.confidence >= next.confidence)
      if (!currentWins) {
        current = next
      }
      // If currentWins, discard next (current absorbs the overlap)
    }
  }
  result.push(current)
  return result
}
