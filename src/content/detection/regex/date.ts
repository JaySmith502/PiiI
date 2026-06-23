import type { Detection } from '../../../types'

const MONTH_NAMES =
  'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?'

function yearInRange(year: number): boolean {
  return year >= 1900 && year <= 2100
}

export function detectDate(text: string): Detection[] {
  const results: Detection[] = []
  let m: RegExpExecArray | null

  // MM/DD/YYYY and MM-DD-YYYY
  const re1 = /(?<!\d)(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?!\d)/g
  while ((m = re1.exec(text)) !== null) {
    const year = parseInt(m[3], 10)
    if (!yearInRange(year)) continue
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'date',
      confidence: 0.75,
      alias: '',
    })
  }

  // YYYY-MM-DD (ISO)
  const re2 = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g
  while ((m = re2.exec(text)) !== null) {
    const year = parseInt(m[1], 10)
    if (!yearInRange(year)) continue
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'date',
      confidence: 0.75,
      alias: '',
    })
  }

  // January 15, 2024  /  Jan 15, 2024  /  Jan 15th 2024
  const re3 = new RegExp(
    `(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`,
    'gi'
  )
  while ((m = re3.exec(text)) !== null) {
    const year = parseInt(m[m.length - 1], 10)
    if (!yearInRange(year)) continue
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'date',
      confidence: 0.75,
      alias: '',
    })
  }

  // 15 Jan 2024
  const re4 = new RegExp(
    `(?<!\\d)(\\d{1,2})\\s+(${MONTH_NAMES})\\s+(\\d{4})(?!\\d)`,
    'gi'
  )
  while ((m = re4.exec(text)) !== null) {
    const year = parseInt(m[m.length - 1], 10)
    if (!yearInRange(year)) continue
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'date',
      confidence: 0.75,
      alias: '',
    })
  }

  return results
}
