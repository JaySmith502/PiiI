import type { Detection } from '../../../types'

export function detectPhone(text: string): Detection[] {
  const results: Detection[] = []
  // Matches:
  //   +1 555 555 5555  |  +1-555-555-5555
  //   (555) 555-5555
  //   555-555-5555
  //   5555555555  (10 digits, no separators)
  // Excludes version-like patterns (digits separated by dots: 1.2.3)
  const re =
    /(?<!\d)(\+1[\s.-]?)?(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?!\d)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const raw = m[0]
    // Reject if surrounded by dots (version numbers)
    const before = text[m.index - 1]
    const after = text[m.index + raw.length]
    if (before === '.' || after === '.') continue
    // Must have at least 10 digits
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 10) continue
    results.push({
      span: [m.index, m.index + raw.length],
      text: raw,
      category: 'phone',
      confidence: 0.85,
      alias: '',
    })
  }
  return results
}
