import type { AliasMap, AuditEntry, ExtensionSettings, WhitelistEntry } from '../types'

const KEYS = {
  settings: 'piiii:settings',
  whitelist: 'piiii:whitelist',
  auditLog: 'piiii:audit',
  aliasMap: (conversationId: string) => `piiii:alias:${conversationId}`,
} as const

// Protection is ON for a fresh install: a data-loss-prevention tool that starts
// disabled protects nobody. The user opts out, never in.
export const DEFAULT_SETTINGS: ExtensionSettings = { enabled: true }

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(KEYS.settings)
  const stored = result[KEYS.settings] as Partial<ExtensionSettings> | undefined
  // Spread over defaults so a partial or legacy object can never leave `enabled`
  // undefined — callers test it for truthiness, and undefined would silently read
  // as "paused" and disable protection.
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
}

export async function setEnabled(enabled: boolean): Promise<void> {
  const current = await getSettings()
  await chrome.storage.local.set({ [KEYS.settings]: { ...current, enabled } })
}

export async function getWhitelist(): Promise<WhitelistEntry[]> {
  const result = await chrome.storage.local.get(KEYS.whitelist)
  return result[KEYS.whitelist] ?? []
}

export async function addToWhitelist(term: string): Promise<void> {
  const list = await getWhitelist()
  // Case-insensitive dedup so "Abbie" then "abbie" don't create two entries.
  // Stored casing stays as first-seen for display in the popup.
  if (list.some(e => e.term.toLowerCase() === term.toLowerCase())) return
  list.push({ term, addedAt: new Date().toISOString() })
  await chrome.storage.local.set({ [KEYS.whitelist]: list })
}

export async function removeFromWhitelist(term: string): Promise<void> {
  const list = await getWhitelist()
  await chrome.storage.local.set({
    [KEYS.whitelist]: list.filter(e => e.term !== term),
  })
}

export async function getAliasMap(conversationId: string): Promise<AliasMap | null> {
  const key = KEYS.aliasMap(conversationId)
  const result = await chrome.storage.local.get(key)
  return result[key] ?? null
}

export async function setAliasMap(map: AliasMap): Promise<void> {
  const key = KEYS.aliasMap(map.conversationId)
  await chrome.storage.local.set({ [key]: map })
}

export async function appendAuditEntry(entry: AuditEntry): Promise<void> {
  const result = await chrome.storage.local.get(KEYS.auditLog)
  const log: AuditEntry[] = result[KEYS.auditLog] ?? []
  log.push(entry)
  // ponytail: cap at 2000 entries; CSV export gets everything before trimming
  const trimmed = log.length > 2000 ? log.slice(log.length - 2000) : log
  await chrome.storage.local.set({ [KEYS.auditLog]: trimmed })
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const result = await chrome.storage.local.get(KEYS.auditLog)
  return result[KEYS.auditLog] ?? []
}

export async function clearAuditLog(): Promise<void> {
  await chrome.storage.local.set({ [KEYS.auditLog]: [] })
}

// Reads a storage.onChanged payload: returns the new whitelist entries when the
// whitelist key changed in local storage, or null when it's an unrelated change.
// Keeps the storage key out of consumers (content script) entirely.
export function whitelistFromChange(
  area: string,
  changes: Record<string, chrome.storage.StorageChange>,
): WhitelistEntry[] | null {
  if (area !== 'local' || !changes[KEYS.whitelist]) return null
  return (changes[KEYS.whitelist].newValue as WhitelistEntry[] | undefined) ?? []
}

// Same contract as whitelistFromChange, for the master switch. Returns the
// effective settings (defaults merged) when the settings key changed, else null.
// A cleared/removed key resolves to the defaults, i.e. protection back on.
export function settingsFromChange(
  area: string,
  changes: Record<string, chrome.storage.StorageChange>,
): ExtensionSettings | null {
  if (area !== 'local' || !changes[KEYS.settings]) return null
  const next = changes[KEYS.settings].newValue as Partial<ExtensionSettings> | undefined
  return { ...DEFAULT_SETTINGS, ...(next ?? {}) }
}
