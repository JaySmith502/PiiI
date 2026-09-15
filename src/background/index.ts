import type {
  ContentToBackground,
  BackgroundResponse,
  NerResponse,
  ContentInboundMessage,
  RightClickedTermResponse,
  SelectedTermResponse,
  ModelStatusResponse,
} from './messages'
import {
  getSettings,
  getWhitelist,
  getAliasMap,
  setAliasMap,
  appendAuditEntry,
  addToWhitelist,
  settingsFromChange,
} from './storage'
import type { AliasMap } from '../types'
import { runNer, warmUp, retryModel, getModelStatus } from './ner'
import { isModelStatusReport, reportModelStatus } from './modelStatus'

// Dev-only breadcrumb: the worker restarts constantly in MV3, so a production
// console log here is pure noise for users and support.
if (import.meta.env.DEV) console.log('[PiiI] service worker started')

// Keep-alive: Chrome may terminate MV3 service workers; alarms prevent this
chrome.alarms.create('keepalive', { periodInMinutes: 0.4 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // no-op; wakes the service worker
  }
})

// Warm up NER model in background on service worker start
// Note: fire-and-forget; errors are non-fatal (user just gets slower first detection)
//
// Skipped while protection is paused: the model is a large one-time download and
// paying for it behind the user's back contradicts "paused". Resuming warms it
// on demand (see the storage listener below), so the first detection after a
// resume is no slower than it would have been.
getSettings()
  .then(settings => { if (settings.enabled) warmUp() })
  .catch(() => warmUp()) // unreadable settings default to protected

// Fetch the model as soon as the user turns protection back on.
chrome.storage.onChanged.addListener((changes, area) => {
  const settings = settingsFromChange(area, changes)
  if (settings?.enabled) warmUp()
})

function registerContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'piiii-allow',
      title: 'PiiI: Always allow this term',
      contexts: ['all'],
    })
  })
}

chrome.runtime.onInstalled.addListener((details) => {
  registerContextMenu()
  // Open the onboarding page on a real install (not on update/browser update):
  // the extension's value only appears at the send button, deep inside someone
  // else's web app, so a fresh install would otherwise look like nothing.
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }).catch((err) => {
      console.warn('[PiiI] could not open onboarding page:', err)
    })
  }
})
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

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  // Offscreen document reporting model health. No reply expected.
  if (isModelStatusReport(message)) {
    reportModelStatus(message)
    return false
  }
  handleMessage(message as ContentToBackground, sendResponse).catch((err) => {
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
      // Defence in depth: a page loaded while protection was on can still ask
      // after the user pauses. Paused means paused — no work, no model load.
      const settings = await getSettings()
      if (!settings.enabled) {
        sendResponse({ ok: true, detections: [], dropped: 0 } as NerResponse)
        break
      }
      const { detections, dropped } = await runNer(message.text)
      sendResponse({ ok: true, detections, dropped } as NerResponse)
      break
    }
    case 'GET_MODEL_STATUS': {
      sendResponse({ ok: true, data: getModelStatus() } as ModelStatusResponse)
      break
    }
    case 'RETRY_MODEL': {
      await retryModel()
      sendResponse({ ok: true, data: getModelStatus() } as ModelStatusResponse)
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
