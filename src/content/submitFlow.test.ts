import { describe, it, expect } from 'vitest'
import type { Detection } from '../types'
import type { Decision } from './review'
import { classifyAction, selectReviewDetections } from './submitFlow'

function det(text: string, category = 'email'): Detection {
  return { span: [0, text.length], text, category, confidence: 0.9, alias: '' }
}
function decision(accepted: boolean, category = 'email'): Decision {
  return { detection: det('x', category), accepted, alias: '[X_1]' }
}

describe('classifyAction', () => {
  it('is "accepted" when every decision is accepted', () => {
    expect(classifyAction([decision(true), decision(true)])).toBe('accepted')
  })

  it('is "sent_original" when no decision is accepted', () => {
    expect(classifyAction([decision(false), decision(false)])).toBe('sent_original')
  })

  it('is "edited" when some but not all are accepted', () => {
    expect(classifyAction([decision(true), decision(false)])).toBe('edited')
  })
})

describe('selectReviewDetections', () => {
  it('reuses the cached aliased set when it matches the exact text', async () => {
    const cached = { text: 'hi bob', detections: [det('bob', 'person')] }
    cached.detections[0].alias = '[PERSON_1]'
    let detectCalled = false
    const result = await selectReviewDetections({
      text: 'hi bob',
      cached,
      whitelist: new Set(),
      detect: () => { detectCalled = true; return [] },
      alias: async d => d,
    })
    expect(detectCalled).toBe(false)
    expect(result.map(d => d.text)).toEqual(['bob'])
  })

  it('computes regex + aliases when the cache does not match the text', async () => {
    const result = await selectReviewDetections({
      text: 'call test@example.com',
      cached: null,
      whitelist: new Set(),
      detect: () => [det('test@example.com', 'email')],
      alias: async d => d.map(x => ({ ...x, alias: '[EMAIL_1]' })),
    })
    expect(result.map(d => d.alias)).toEqual(['[EMAIL_1]'])
  })

  it('drops detections that never received an alias', async () => {
    const result = await selectReviewDetections({
      text: 'mixed',
      cached: null,
      whitelist: new Set(),
      detect: () => [det('a'), det('b')],
      alias: async d => d.map((x, i) => ({ ...x, alias: i === 0 ? '[A_1]' : '' })),
    })
    expect(result.map(d => d.text)).toEqual(['a'])
  })

  it('returns nothing when regex finds nothing, without aliasing', async () => {
    let aliasCalled = false
    const result = await selectReviewDetections({
      text: 'nothing here',
      cached: null,
      whitelist: new Set(),
      detect: () => [],
      alias: async d => { aliasCalled = true; return d },
    })
    expect(result).toEqual([])
    expect(aliasCalled).toBe(false)
  })
})
