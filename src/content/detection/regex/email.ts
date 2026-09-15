import type { Detection } from '../../../types'

export function detectEmail(text: string): Detection[] {
  const results: Detection[] = []
  // Local part: anything except whitespace, "@", and the characters that
  // delimit an address inside prose — brackets, angle brackets, quotes,
  // commas, semicolons, colons.
  //
  // The previous form (`[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}`) let the greedy local
  // part swallow whatever punctuation preceded the address, so
  // "(john@example.com)" was reported as "(john@example.com" — the span
  // started on the opening paren. Redaction then replaced the paren along with
  // the address and mangled the sentence. A `,`-separated list bled the comma
  // into the next address the same way.
  //
  // Domain: dot-separated labels capped at 63 chars; the TLD is bounded at 24
  // so modern gTLDs like `.photography` are matched, and the label pattern
  // keeps leading/trailing hyphens out.
  const re =
    /[^\s@()<>\[\]{}",;:\\]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}/g
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
