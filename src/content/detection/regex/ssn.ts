import type { Detection } from '../../../types'

export function detectSsn(text: string): Detection[] {
  const results: Detection[] = []
  // Dashes or spaces required to reduce false positives
  const re = /(?<!\d)(\d{3})([-\s])(\d{2})\2(\d{4})(?!\d)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const area = parseInt(m[1], 10)
    // Reject invalid area codes: 000, 666, 900-999
    if (area === 0 || area === 666 || area >= 900) continue
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'ssn',
      confidence: 0.98,
      alias: '',
    })
  }
  return results
}
