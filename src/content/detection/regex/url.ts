import type { Detection } from '../../../types'

// Common TLDs for bare-domain matching
const COMMON_TLDS =
  'com|net|org|io|gov|edu|co|uk|de|fr|au|ca|jp|cn|br|ru|it|es|nl|se|no|fi|dk|pl|cz|hu|ro|bg|hr|sk|si|ee|lv|lt|pt|gr|at|be|ch|lu|ie|is|nz|za|mx|ar|cl|pe|ve|co|in|sg|my|th|ph|id|vn|tw|kr|hk|ae|sa|ng|ke|gh|tz|ug|zm|zw|mz|ma|dz|tn|eg|sd|ly|tn|ao|cm|ci|sn|ml|bf|ne|td|cf|cg|ga|gn|gm|sl|lr|mr|er|so|dj|km|mg|mu|sc|cv|st|gw|gq|bi|rw|rw|bj|tg|bw|ls|sz|na|re|yt|pm|gp|mq|tf|wf|nc|pf|ck|nu|to|tv|ws|ki|fm|pw|mh|gu|mp|vi|pr|as|um|io|sh|ac|gg|je|im|gi|fo|pm|gl|aw|cw|bq|sx|mf|bl|gp|mq|re|yt|tf|wf|nc|pf|ck|nu'

export function detectUrl(text: string): Detection[] {
  const results: Detection[] = []

  // Match http/https URLs (including query strings and fragments)
  const reHttp =
    /https?:\/\/[^\s"'<>()\[\]{}]+/gi
  let m: RegExpExecArray | null
  while ((m = reHttp.exec(text)) !== null) {
    // Trim trailing punctuation that is unlikely part of URL
    let url = m[0].replace(/[.,;:!?)'"]+$/, '')
    results.push({
      span: [m.index, m.index + url.length],
      text: url,
      category: 'url',
      confidence: 0.95,
      alias: '',
    })
  }

  // Match bare domains like example.com, sub.example.co.uk
  const reBare = new RegExp(
    `(?<![\\w@])(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+(?:${COMMON_TLDS})(?![\\w])`,
    'gi'
  )
  while ((m = reBare.exec(text)) !== null) {
    const url = m[0]
    // Skip if already inside an http match
    const overlaps = results.some(
      (d) => m !== null && d.span[0] <= m.index && m.index < d.span[1]
    )
    if (overlaps) continue
    results.push({
      span: [m.index, m.index + url.length],
      text: url,
      category: 'url',
      confidence: 0.95,
      alias: '',
    })
  }

  return results
}
