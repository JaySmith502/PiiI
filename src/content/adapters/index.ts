import type { PlatformAdapter } from './types'
import { chatgptAdapter } from './chatgpt'
import { claudeAdapter } from './claude'
import { geminiAdapter } from './gemini'
import { copilotAdapter } from './copilot'
import { grokAdapter } from './grok'
import { perplexityAdapter } from './perplexity'
import { deepseekAdapter } from './deepseek'

const ADAPTER_MAP: Record<string, PlatformAdapter> = {
  'chat.openai.com': chatgptAdapter,
  'chatgpt.com': chatgptAdapter,
  'claude.ai': claudeAdapter,
  'gemini.google.com': geminiAdapter,
  'copilot.microsoft.com': copilotAdapter,
  'grok.com': grokAdapter,
  'x.com': grokAdapter,
  'www.perplexity.ai': perplexityAdapter,
  'chat.deepseek.com': deepseekAdapter,
}

export function getAdapter(): PlatformAdapter | null {
  return ADAPTER_MAP[window.location.hostname] ?? null
}

export type { PlatformAdapter }
