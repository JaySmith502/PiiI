import { describe, it, expect } from 'vitest'
import type { Detection } from '../../types'
import { runDetection, combineDetections } from './index'
import { mergeDetections } from './merge'
import { detectPhone } from './regex/phone'
import { detectEmail } from './regex/email'

// Detection factory — keeps tests readable; alias defaults empty (set during review).
function det(span: [number, number], text: string, category: string, confidence = 0.9): Detection {
  return { span, text, category, confidence, alias: '' }
}

describe('runDetection', () => {
  it('detects an email through the public interface', () => {
    const found = runDetection('reach me at test@example.com')
    expect(found.some(d => d.category === 'email')).toBe(true)
  })

  it('returns nothing for empty text', () => {
    expect(runDetection('')).toEqual([])
  })

  it('drops a detection whose text is whitelisted', () => {
    const text = 'reach me at test@example.com'
    const whitelist = new Set(['test@example.com'])
    const found = runDetection(text, whitelist)
    expect(found.some(d => d.text === 'test@example.com')).toBe(false)
  })
})

describe('combineDetections', () => {
  it('merges regex and NER detections, wider span winning on overlap', () => {
    const regex = [det([0, 10], '11-14-1982', 'date')]
    const ner = [det([0, 2], '11', 'number')]
    const merged = combineDetections(regex, ner, new Set())
    expect(merged).toHaveLength(1)
    expect(merged[0].category).toBe('date')
  })

  it('applies the whitelist to an NER-originated detection', () => {
    const regex: Detection[] = []
    const ner = [det([0, 8], 'John Doe', 'person')]
    const merged = combineDetections(regex, ner, new Set(['John Doe']))
    expect(merged.some(d => d.text === 'John Doe')).toBe(false)
  })
})

// Regression cover for a false negative found by the dev-time self-check in
// detection/index.ts: the version-number guard rejected any phone number with a
// period on either side, so "call me at (555) 867-5309." was never flagged —
// the single most common way a phone number appears in a prompt.
describe('detectPhone', () => {
  const found = (text: string) => detectPhone(text).map(d => d.text)

  it.each([
    ['(555) 867-5309', 'parenthesised'],
    ['555-867-5309', 'dashed'],
    ['555.867.5309', 'dotted'],
    ['555 867 5309', 'spaced'],
    ['+1 555 867 5309', 'country code, spaced'],
    ['+1-555-867-5309', 'country code, dashed'],
  ])('detects %s (%s)', (number) => {
    expect(found(`reach me at ${number}`)).toContain(number)
  })

  it.each([
    ['call me at (555) 867-5309.', 'ending a sentence'],
    ['call me at 555-867-5309.', 'ending a sentence, dashed'],
    ['ring +1 555 867 5309.', 'ending a sentence, country code'],
    ['(555) 867-5309.\nSee you then.', 'followed by a newline'],
    ['Phone: (555) 867-5309, thanks.', 'followed by a comma'],
  ])('still detects %s (%s)', (text) => {
    expect(detectPhone(text).length).toBeGreaterThan(0)
  })

  it('does not flag a version-like dotted digit run', () => {
    expect(found('node 1.555.555.5555.6')).toEqual([])
  })

  it('does not flag a 9-digit run', () => {
    expect(found('id 555-867-530')).toEqual([])
  })
})

// Regression cover for a delimiter-bleed bug: the greedy local-part pattern
// used to absorb whatever punctuation sat before an address, so a bracketed or
// quoted address was reported with the leading delimiter inside the span and
// redaction mangled the surrounding sentence.
describe('detectEmail', () => {
  const found = (text: string) => detectEmail(text).map(d => d.text)

  it.each([
    ['reach me at test@example.com', 'bare'],
    ['user+tag@sub.domain.io', 'plus tag, subdomain'],
    ["o'brien@example.com", 'apostrophe in the local part'],
    ['sales@acme.photography', 'long modern gTLD'],
  ])('detects %s (%s)', (text) => {
    expect(found(text)).toHaveLength(1)
  })

  it.each([
    ['email (john@example.com) please', 'john@example.com', 'parenthesised'],
    ['Contact <jane.doe@corp.co.uk> today', 'jane.doe@corp.co.uk', 'angle-bracketed'],
    ['quoted: "a@b.com"', 'a@b.com', 'double-quoted'],
    ['reach me at john@example.com.', 'john@example.com', 'ending a sentence'],
    ['hi john@example.com; bye', 'john@example.com', 'followed by a semicolon'],
  ])('does not bleed the delimiter around %s (%s)', (text, expected) => {
    expect(found(text)).toEqual([expected])
  })

  it('splits a comma-separated list into two clean addresses', () => {
    expect(found('list: a@b.com,b@c.com')).toEqual(['a@b.com', 'b@c.com'])
  })

  it('does not flag ordinary dotted text', () => {
    expect(found('Prices at 1.2.3 or file.txt')).toEqual([])
  })
})

describe('mergeDetections', () => {
  it('keeps both detections when spans do not overlap', () => {
    const merged = mergeDetections([
      det([0, 5], 'aaaaa', 'x'),
      det([5, 10], 'bbbbb', 'y'),
    ])
    expect(merged).toHaveLength(2)
  })

  it('prefers the wider span when two detections overlap', () => {
    const wide = det([0, 10], 'wholenumber', 'wide')
    const narrow = det([2, 5], 'ole', 'narrow')
    const merged = mergeDetections([narrow, wide])
    expect(merged).toHaveLength(1)
    expect(merged[0].category).toBe('wide')
  })

  it('breaks an equal-width overlap tie by confidence', () => {
    const lo = det([0, 4], 'aaaa', 'lo', 0.5)
    const hi = det([0, 4], 'aaaa', 'hi', 0.95)
    const merged = mergeDetections([lo, hi])
    expect(merged).toHaveLength(1)
    expect(merged[0].category).toBe('hi')
  })
})
