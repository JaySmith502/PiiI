import type { Detection } from '../../../types'

function entropy(s: string): number {
  const freq = new Map<string, number>()
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1)
  return -[...freq.values()].reduce((sum, n) => {
    const p = n / s.length
    return sum + p * Math.log2(p)
  }, 0)
}

export function detectApiKey(text: string): Detection[] {
  const results: Detection[] = []

  // 1. Known prefixes
  const knownPrefixRe =
    /(?:sk-|pk-|ghp_|gho_|ghr_|xoxb-|xoxp-|AKIA)[A-Za-z0-9_\-]{8,}/g
  let m: RegExpExecArray | null
  while ((m = knownPrefixRe.exec(text)) !== null) {
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'api_key',
      confidence: 0.80,
      alias: '',
    })
  }

  // 2. Bearer tokens
  const bearerRe = /Bearer\s+([A-Za-z0-9_\-.~+\/]{20,})/g
  while ((m = bearerRe.exec(text)) !== null) {
    // Include "Bearer " prefix in the span so replacement is clean
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'api_key',
      confidence: 0.80,
      alias: '',
    })
  }

  // 3. Generic high-entropy strings (20+ chars, entropy > 3.5)
  const genericRe = /[A-Za-z0-9_\-+\/=]{20,}/g
  while ((m = genericRe.exec(text)) !== null) {
    const s = m[0]
    // Skip if already covered by a known-prefix match
    const alreadyCovered = results.some(
      (d) => m !== null && d.span[0] <= m.index && m.index + s.length <= d.span[1]
    )
    if (alreadyCovered) continue
    if (entropy(s) > 3.5) {
      results.push({
        span: [m.index, m.index + s.length],
        text: s,
        category: 'api_key',
        confidence: 0.80,
        alias: '',
      })
    }
  }

  return results
}
