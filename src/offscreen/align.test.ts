import { describe, it, expect } from 'vitest'
import { locateAll } from './align'

// Each case feeds DECODED entity words (left) that mimic transformers.js
// `tokenizer.decode` artifacts — respaced punctuation, folded case/accents,
// subword fragments — and asserts what gets masked out of the source text.
// These are the exact failure modes the old `text.indexOf(word)` dropped.
describe('offscreen NER offset recovery (align)', () => {
  it('matches a plain multi-token name', () => {
    expect(locateAll('My name is Sarah Chen here', ['Sarah Chen'])).toEqual(['Sarah Chen'])
  })

  it('recovers accented names from a folded/uncased decode', () => {
    expect(locateAll('Contact José Müller now', ['jose', 'muller'])).toEqual(['José', 'Müller'])
  })

  it('tolerates punctuation respacing from decode', () => {
    expect(locateAll("Email O'Brien at x", ["o ' brien"])).toEqual(["O'Brien"])
  })

  it('tolerates extra whitespace in the source', () => {
    expect(locateAll('Mr  John   Smith ok', ['John Smith'])).toEqual(['John   Smith'])
  })

  it('resolves duplicate values to distinct occurrences via the cursor', () => {
    expect(locateAll('John paid John back', ['John', 'John'])).toEqual(['John', 'John'])
  })

  it('falls back to a global scan for out-of-order entities', () => {
    expect(locateAll('See Smith then Alice', ['Alice', 'Smith'])).toEqual(['Alice', 'Smith'])
  })

  it('handles non-Latin (Cyrillic) scripts', () => {
    expect(locateAll('Город Пловдив тут', ['пловдив'])).toEqual(['Пловдив'])
  })

  it('snaps a partial subword tag to the whole word', () => {
    expect(locateAll('I live in Springfield now', ['Spring'])).toEqual(['Springfield'])
  })

  it('returns null for an unplaceable entity rather than crashing', () => {
    expect(locateAll('nothing here', ['Ghost'])).toEqual([null])
  })
})
