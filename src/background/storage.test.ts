import { describe, it, expect, beforeEach } from 'vitest'
import type { AuditEntry, WhitelistEntry } from '../types'
import {
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  appendAuditEntry,
  getAuditLog,
  clearAuditLog,
  whitelistFromChange,
} from './storage'

// Fake chrome.storage.local at the boundary — the accessors are tested through
// their public interface; only the external API is stubbed.
function fakeStorage(initial: Record<string, unknown> = {}): Record<string, unknown> {
  const store: Record<string, unknown> = { ...initial }
  ;(globalThis as { chrome?: unknown }).chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: store[key] }),
        set: async (obj: Record<string, unknown>) => { Object.assign(store, obj) },
      },
    },
  }
  return store
}

function entry(action: AuditEntry['action'] = 'accepted'): AuditEntry {
  return { timestamp: 't', platform: 'claude', classesDetected: [], action, aliasCount: 0 }
}

describe('whitelist storage', () => {
  beforeEach(() => { fakeStorage() })

  it('returns an empty list when nothing is stored', async () => {
    expect(await getWhitelist()).toEqual([])
  })

  it('adds a term', async () => {
    await addToWhitelist('alice')
    expect((await getWhitelist()).map(e => e.term)).toEqual(['alice'])
  })

  it('does not add a duplicate term', async () => {
    await addToWhitelist('alice')
    await addToWhitelist('alice')
    expect(await getWhitelist()).toHaveLength(1)
  })

  it('removes a term', async () => {
    await addToWhitelist('alice')
    await addToWhitelist('bob')
    await removeFromWhitelist('alice')
    expect((await getWhitelist()).map(e => e.term)).toEqual(['bob'])
  })
})

describe('audit log storage', () => {
  it('appends an entry', async () => {
    fakeStorage()
    await appendAuditEntry(entry())
    expect(await getAuditLog()).toHaveLength(1)
  })

  it('trims to the most recent 2000 entries', async () => {
    const seeded: AuditEntry[] = Array.from({ length: 2000 }, (_, i) => ({
      ...entry(), timestamp: `old-${i}`,
    }))
    fakeStorage({ 'piiii:audit': seeded })
    await appendAuditEntry({ ...entry(), timestamp: 'newest' })
    const log = await getAuditLog()
    expect(log).toHaveLength(2000)
    expect(log[log.length - 1].timestamp).toBe('newest')
    expect(log[0].timestamp).toBe('old-1') // 'old-0' fell off the front
  })

  it('clears the log', async () => {
    fakeStorage({ 'piiii:audit': [entry(), entry()] })
    await clearAuditLog()
    expect(await getAuditLog()).toEqual([])
  })
})

describe('whitelistFromChange', () => {
  const wl = (terms: string[]): WhitelistEntry[] => terms.map(t => ({ term: t, addedAt: 't' }))

  it('returns the new entries when the whitelist key changed in local', () => {
    const changes = { 'piiii:whitelist': { newValue: wl(['alice']) } }
    expect(whitelistFromChange('local', changes)?.map(e => e.term)).toEqual(['alice'])
  })

  it('returns an empty list when the whitelist key was cleared', () => {
    const changes = { 'piiii:whitelist': { oldValue: wl(['alice']) } }
    expect(whitelistFromChange('local', changes)).toEqual([])
  })

  it('returns null for a non-local area', () => {
    const changes = { 'piiii:whitelist': { newValue: wl(['alice']) } }
    expect(whitelistFromChange('sync', changes)).toBeNull()
  })

  it('returns null when the whitelist key did not change', () => {
    const changes = { 'piiii:audit': { newValue: [] } }
    expect(whitelistFromChange('local', changes)).toBeNull()
  })
})
