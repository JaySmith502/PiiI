export type PlatformId =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'copilot'
  | 'grok'
  | 'perplexity'
  | 'deepseek'

export interface Detection {
  span: [number, number]  // character offsets [start, end]
  text: string
  category: string        // was: class
  confidence: number
  alias: string
}

export interface AliasMap {
  conversationId: string
  platform: PlatformId
  aliases: Record<string, string> // realValue → placeholder
}

export interface AuditEntry {
  timestamp: string
  platform: PlatformId
  classesDetected: string[]  // was: classes_detected
  action: 'accepted' | 'edited' | 'sent_original'
  aliasCount: number
}

export interface WhitelistEntry {
  term: string
  addedAt: string
}

export interface ExtensionSettings {
  enabled: boolean
  whitelist: string[]  // terms the user has whitelisted
}
