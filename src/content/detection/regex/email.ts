import type { Detection } from '../../../types'

export function detectEmail(text: string): Detection[] {
  const results: Detection[] = []
  // [^\s@]+ @ [^\s@]+ . TLD(2-6 chars)
  const re = /[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    results.push({
      span: [m.index, m.index + m[0].length],
      text: m[0],
      category: 'email',
      confidence: 0.99,
      alias: '',
    })
  }
  return results
}
