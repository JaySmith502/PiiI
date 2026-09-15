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
  const isDigit = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9'
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const raw = m[0]
    // Reject only when the match sits *inside* a dotted digit run, i.e. a
    // version-like string such as `1.555.555.5555.6`.
    //
    // Testing for a bare adjacent dot instead would discard every phone number
    // that ends a sentence — "call me at (555) 867-5309." — which is the most
    // common way one is written. The guard needs a digit on the far side of the
    // dot to tell the two apart.
    const before = text[m.index - 1]
    const after = text[m.index + raw.length]
    const insideDottedRun =
      (before === '.' && isDigit(text[m.index - 2])) ||
      (after === '.' && isDigit(text[m.index + raw.length + 1]))
    if (insideDottedRun) continue
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
