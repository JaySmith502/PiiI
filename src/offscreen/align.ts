/**
 * Offset recovery for token-classification output.
 *
 * `aggregation_strategy: 'simple'` in transformers.js returns NO character
 * offsets (the pipeline source carries a literal `// TODO: Add support for start
 * and end`), only a re-decoded `word`. That decoded string reshapes whitespace
 * and punctuation and — on an uncased model — casing, so a naive
 * `sourceText.indexOf(word)` fails on exactly the accented and multi-token names
 * and silently drops them.
 *
 * We instead align the entity's *alphanumeric token sequence* onto the source's
 * alphanumeric runs: case/accent-folded, whitespace/punctuation-agnostic. A
 * token matches a run when equal or as a prefix/suffix, so a partial subword tag
 * ("Spring" of "Springfield") snaps to the whole word. Pure + dependency-free so
 * it can be unit-tested without the offscreen document's chrome side effects.
 */

/** Fold to a comparison form (NFKD, drop combining marks, lowercase) while
 * keeping a map from each folded-char index back to its original index. */
export function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const f = text[i].normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    for (const c of f) { folded += c; map.push(i) }
  }
  return { folded, map }
}

export const ALNUM = /[\p{L}\p{N}]+/gu

export interface Run { text: string; oStart: number; oEnd: number }

/** Alphanumeric runs of the folded text, each carrying its ORIGINAL [start,end). */
export function alnumRuns(folded: string, map: number[], origLen: number): Run[] {
  const runs: Run[] = []
  for (const m of folded.matchAll(ALNUM)) {
    const fStart = m.index ?? 0
    const fEnd = fStart + m[0].length
    runs.push({ text: m[0], oStart: map[fStart], oEnd: (map[fEnd - 1] ?? origLen - 1) + 1 })
  }
  return runs
}

/** Folded alphanumeric tokens of a decoded entity word (leading '#'s stripped). */
export function entityTokens(word: string): string[] {
  const { folded } = foldWithMap(word.replace(/^#+/, ''))
  return folded.match(ALNUM) ?? []
}

export const tokenMatchesRun = (runText: string, tok: string): boolean =>
  runText === tok || runText.startsWith(tok) || runText.endsWith(tok)

/** Locate an entity's token sequence among source runs, preferring the first
 * match at/after `runCursor` (so repeated values resolve in order), then falling
 * back to a global scan (out-of-order entities). Returns original-text offsets
 * and the next cursor, or null when unplaceable. */
export function locateEntity(
  tokens: string[],
  runs: Run[],
  runCursor: number,
): { span: [number, number]; nextCursor: number } | null {
  if (tokens.length === 0) return null
  const scan = (from: number): number => {
    outer: for (let i = from; i + tokens.length <= runs.length; i++) {
      for (let k = 0; k < tokens.length; k++) {
        if (!tokenMatchesRun(runs[i + k].text, tokens[k])) continue outer
      }
      return i
    }
    return -1
  }
  let i = scan(runCursor)
  if (i === -1) i = scan(0)
  if (i === -1) return null
  const last = i + tokens.length - 1
  return { span: [runs[i].oStart, runs[last].oEnd], nextCursor: last + 1 }
}

/**
 * Convenience for tests and callers: resolve a sequence of decoded entity words
 * against `text`, returning the masked substring for each (or null when
 * unplaceable). Mirrors how the offscreen loop walks `runCursor`.
 */
export function locateAll(text: string, words: string[]): (string | null)[] {
  const { folded, map } = foldWithMap(text)
  const runs = alnumRuns(folded, map, text.length)
  let cursor = 0
  return words.map(w => {
    const hit = locateEntity(entityTokens(w), runs, cursor)
    if (!hit) return null
    cursor = hit.nextCursor
    return text.slice(hit.span[0], hit.span[1])
  })
}
