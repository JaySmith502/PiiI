import { describe, it, expect } from 'vitest'
import { firstMatch, lastMatch } from './shared'

const el = (id: string) => ({ id }) as unknown as HTMLElement

// Minimal stand-in for a DOM root: maps a selector string to its matches.
function fakeRoot(map: Record<string, HTMLElement[]>) {
  return {
    querySelector: (s: string) => map[s]?.[0] ?? null,
    querySelectorAll: (s: string) => (map[s] ?? []) as unknown as NodeListOf<Element>,
  }
}

describe('firstMatch', () => {
  it('returns the element for the earliest selector that matches', () => {
    const a = el('a'), b = el('b')
    const root = fakeRoot({ '.a': [a], '.b': [b] })
    expect(firstMatch(['.a', '.b'], root)).toBe(a)
  })

  it('falls through to a later selector when earlier ones miss', () => {
    const b = el('b')
    const root = fakeRoot({ '.b': [b] })
    expect(firstMatch(['.a', '.b'], root)).toBe(b)
  })

  it('returns null when no selector matches', () => {
    expect(firstMatch(['.a', '.b'], fakeRoot({}))).toBeNull()
  })
})

describe('lastMatch', () => {
  it('returns the last element matched by the selector', () => {
    const a = el('a'), b = el('b'), c = el('c')
    const root = fakeRoot({ '.msg': [a, b, c] })
    expect(lastMatch('.msg', root)).toBe(c)
  })

  it('returns null when nothing matches', () => {
    expect(lastMatch('.msg', fakeRoot({}))).toBeNull()
  })
})
