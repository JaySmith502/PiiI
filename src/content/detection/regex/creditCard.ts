import type { Detection } from '../../../types'

function luhn(num: string): boolean {
  const digits = num.replace(/\D/g, '')
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alt) { n *= 2; if (n > 9) n -= 9 }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export function detectCreditCard(text: string): Detection[] {
  const results: Detection[] = []
  // 13-19 digit groups separated by optional spaces or dashes
  // Groups: 4-4-4-4 (Visa/MC/Amex variants), or compacted
  const re = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const raw = m[0]
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19) continue
    // Hybrid gate: a number written WITH separators (spaces/dashes) is
    // intentional card formatting — flag it even if Luhn fails (catches
    // fake/test numbers). A bare digit run still requires Luhn so we don't
    // flag long order numbers / IDs.
    const formatted = /[ -]/.test(raw)
    if (!formatted && !luhn(digits)) continue
    results.push({
      span: [m.index, m.index + raw.length],
      text: raw,
      category: 'credit_card',
      confidence: 0.97,
      alias: '',
    })
  }
  return results
}

if (import.meta.env.DEV) {
  const has = (t: string) => detectCreditCard(t).length > 0
  console.assert(has('4532 0151 1283 0366'), '[PiiI] cc: valid formatted missed')
  console.assert(has('4532-0151-1283-0366'), '[PiiI] cc: valid dashed missed')
  console.assert(has('4532015112830366'), '[PiiI] cc: valid bare missed')
  console.assert(has('1234 5678 9012 3456'), '[PiiI] cc: fake formatted should flag')
  console.assert(!has('1234567890123456'), '[PiiI] cc: fake bare should NOT flag')
}
