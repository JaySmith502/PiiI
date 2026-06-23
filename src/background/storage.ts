import type { AliasMap, AuditEntry, ExtensionSettings, WhitelistEntry } from '../types'

const KEYS = {
  settings: 'piiii:settings',
  whitelist: 'piiii:whitelist',
  auditLog: 'piiii:audit',
  aliasMap: (conversationId: string) => `piiii:alias:${conversationId}`,
} as const

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(KEYS.settings)
  return result[KEYS.settings] ?? { enabled: true, whitelist: [] }
}

export async function getWhitelist(): Promise<WhitelistEntry[]> {
  const result = await chrome.storage.local.get(KEYS.whitelist)
  return result[KEYS.whitelist] ?? []
}

export async function addToWhitelist(term: string): Promise<void> {
  const list = await getWhitelist()
  if (list.some(e => e.term === term)) return  // case-sensitive dedup
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
