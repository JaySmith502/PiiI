import type { Detection } from '../../../types'

export function detectAccountId(text: string): Detection[] {
  const results: Detection[] = []

  // Keyword-prefixed account/reference numbers
  const keywordRe =
    /(?:account|acct|customer|ref(?:erence)?|invoice|order|case)[\s#:]+([A-Z0-9][A-Z0-9-]{3,19})/gi
  let m: RegExpExecArray | null
  while ((m = keywordRe.exec(text)) !== null) {
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'account_id',
      confidence: 0.70,
      alias: '',
    })
  }

  // UUID format
  const uuidRe =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
  while ((m = uuidRe.exec(text)) !== null) {
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'account_id',
      confidence: 0.70,
      alias: '',
    })
  }

  return results
}
