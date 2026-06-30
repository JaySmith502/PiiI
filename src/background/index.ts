import type {
  ContentToBackground,
  BackgroundResponse,
  NerResponse,
  ContentInboundMessage,
  RightClickedTermResponse,
  SelectedTermResponse,
} from './messages'
import { getSettings, getWhitelist, getAliasMap, setAliasMap, appendAuditEntry, addToWhitelist } from './storage'
import type { AliasMap } from '../types'
import { runNer, warmUp } from './ner'

console.log('[PiiI] service worker started')

// Keep-alive: Chrome may terminate MV3 service workers; alarms prevent this
chrome.alarms.create('keepalive', { periodInMinutes: 0.4 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // no-op; wakes the service worker
  }
})

// Warm up NER model in background on service worker start
// ponytail: fire-and-forget; errors are non-fatal (user just gets slower first detection)
warmUp()

function registerContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'piiii-allow',
      title: 'PiiI: Always allow this term',
      contexts: ['all'],
    })
  })
}

chrome.runtime.onInstalled.addListener(registerContextMenu)
chrome.runtime.onStartup.addListener(registerContextMenu)

chrome.contextMenus.onClicked.addListener((_info, tab) => {
  if (!tab?.id) return  // no active tab (e.g. fired from extension popup)
  try {
    chrome.tabs.sendMessage(
      tab.id,
      { type: 'GET_LAST_RIGHTCLICKED_TERM' } satisfies ContentInboundMessage,
      (response?: RightClickedTermResponse) => {
        if (chrome.runtime.lastError || !response?.term) return
        addToWhitelist(response.term).catch(err =>
          console.warn('[PiiI] addToWhitelist failed:', err)
        )
      }
    )
  } catch {
    // content script not injected on this tab - no-op
  }
})

// Hotkey path (Alt+Shift+A): mirror of the context-menu allow flow, but the
// term comes from the page selection instead of a right-clicked highlight.
// chrome.commands fires in the service worker and can't read the page, so we
// ask the active tab's content script for window.getSelection(), then whitelist.
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'allow-selection') return
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return
    try {
      chrome.tabs.sendMessage(
        tab.id,
        { type: 'GET_SELECTED_TERM' } satisfies ContentInboundMessage,
        (response?: SelectedTermResponse) => {
          if (chrome.runtime.lastError || !response?.term) return
          addToWhitelist(response.term).catch(err =>
            console.warn('[PiiI] addToWhitelist (hotkey) failed:', err)
          )
        }
      )
    } catch {
      // content script not injected on this tab - no-op
    }
  })
})

chrome.runtime.onMessage.addListener((message: ContentToBackground, _sender, sendResponse) => {
  handleMessage(message, sendResponse).catch((err) => {
    sendResponse({ ok: false, error: String(err) })
  })
  return true // keep channel open for async responses
})

async function handleMessage(
  message: ContentToBackground,
  sendResponse: (response: BackgroundResponse | NerResponse) => void
): Promise<void> {
  try {
  switch (message.type) {
    case 'PING':
      sendResponse({ ok: true })
      break
    case 'RUN_NER': {
      const { detections, dropped } = await runNer(message.text)
      sendResponse({ ok: true, detections, dropped } as NerResponse)
      break
    }
    case 'GET_ALIAS_MAP': {
      const map = await getAliasMap(message.conversationId)
      sendResponse({ ok: true, data: map })
      break
    }
    case 'SET_ALIAS_MAP': {
      const aliasMap: AliasMap = {
        conversationId: message.conversationId,
        platform: message.platform,
        aliases: message.aliases,
      }
      await setAliasMap(aliasMap)
      sendResponse({ ok: true })
      break
    }
    case 'LOG_AUDIT':
      await appendAuditEntry(message.entry)
      sendResponse({ ok: true })
      break
    case 'GET_SETTINGS': {
      const settings = await getSettings()
      sendResponse({ ok: true, data: settings })
      break
    }
    case 'GET_WHITELIST': {
      const whitelist = await getWhitelist()
      sendResponse({ ok: true, data: whitelist })
      break
    }
    default:
      sendResponse({ ok: false, error: `Unknown message type: ${(message as { type: string }).type}` })
  }
  } catch (err) {
    sendResponse({ ok: false, error: String(err) })
  }
}
