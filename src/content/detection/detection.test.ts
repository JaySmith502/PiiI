import { describe, it, expect } from 'vitest'
import type { Detection } from '../../types'
import { runDetection, combineDetections } from './index'
import { mergeDetections } from './merge'

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
