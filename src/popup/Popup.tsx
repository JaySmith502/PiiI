import { useState, useEffect, useCallback } from 'react'
import type { AuditEntry, WhitelistEntry } from '../types'
import {
  getAuditLog,
  getWhitelist,
  clearAuditLog,
  setEnabled,
  getSettings,
  addToWhitelist as addWhitelistTerm,
  removeFromWhitelist as removeWhitelistTerm,
} from '../background/storage'
import type {
  ContentInboundMessage,
  CurrentAliasesResponse,
  ModelStatusResponse,
} from '../background/messages'
import type { ModelStatus } from '../background/modelStatus'
import { C, FONT, BrandMark } from '../brand'

type AliasData = { conversationId: string; aliases: Record<string, string> }

const PLATFORM_LABEL: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  copilot: 'Copilot',
  grok: 'Grok',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
}

const ACTION_STYLE: Record<string, { label: string; color: string }> = {
  accepted:      { label: 'accepted', color: C.green },
  edited:        { label: 'edited',   color: C.yellow600 },
  sent_original: { label: 'original', color: C.ink500 },
}

// How the popup presents each model state, including what the user should do
// about it. Loading is a one-time download, so it explains the wait instead of
// looking like a hang.
const MODEL_VIEW: Record<ModelStatus['state'], { label: string; color: string; hint: string }> = {
  idle: {
    label: 'Not loaded',
    color: C.ink500,
    hint: 'The detection model loads the first time you send a message.',
  },
  loading: {
    label: 'Loading…',
    color: C.yellow600,
    hint: 'First run downloads the model once, then it is cached on this device. Pattern rules (email, phone, card, SSN…) already work.',
  },
  ready: {
    label: 'Ready',
    color: C.green,
    hint: 'Names, addresses and the pattern rules are all active. Inference runs on this device.',
  },
  error: {
    label: 'Unavailable',
    color: C.red,
    hint: 'The model could not be loaded — names and addresses will not be detected. Pattern rules still work. Retry when you are back online.',
  },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function csvCell(v: string): string {
  return v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')
    ? '"' + v.replace(/"/g, '""') + '"'
    : v
}

function downloadCSV(log: AuditEntry[]): void {
  const header = 'timestamp,platform,action,classes_detected,alias_count'
  const rows = [...log].reverse().map(e =>
    [csvCell(e.timestamp), csvCell(e.platform), csvCell(e.action), csvCell(e.classesDetected.join(',')), String(e.aliasCount)].join(',')
  )
  const csv = [header, ...rows].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `piiii-audit-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// How long the popup keeps asking the service worker about the model. A cold
// first-run download can take a minute; past that we stop polling and leave the
// Retry button as the escape hatch (the popup is short-lived anyway).
const MODEL_POLL_MS = 1500
const MODEL_POLL_MAX_ATTEMPTS = 40

async function queryModelStatus(): Promise<ModelStatus | null> {
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'GET_MODEL_STATUS' })) as
      | ModelStatusResponse
      | undefined
    return res && res.ok ? res.data : null
  } catch {
    // Service worker asleep and won't wake for this message — treat as unknown.
    return null
  }
}

// ---- shared style fragments ----
const monoLabel: React.CSSProperties = {
  fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.14em',
  textTransform: 'uppercase', color: C.ink500,
}
const cardStyle: React.CSSProperties = {
  border: `2px solid ${C.ink}`, borderRadius: '8px', background: C.white, overflow: 'hidden',
}
const sectionTitle: React.CSSProperties = {
  fontFamily: FONT.display, fontWeight: 800, fontSize: '14px', letterSpacing: '-0.01em', color: C.ink,
}
const hintStyle: React.CSSProperties = {
  margin: 0, fontSize: '11px', lineHeight: '15px', color: C.ink500,
}

function CountBadge({ n }: { n: number }) {
  return (
    <span style={{
      fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', color: '#fff', background: C.ink,
      padding: '1px 6px', borderRadius: '3px',
    }}>
      {n}
    </span>
  )
}

function Chevron({ open }: { open: boolean }) {
  return <span style={{ color: C.ink500, fontSize: '12px', transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .12s' }}>▾</span>
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: '7px', height: '7px', flex: 'none', borderRadius: '999px', background: color }} />
}

// Text-only link, styled to match the mono labels in the cards.
const linkBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
  fontFamily: FONT.mono, fontSize: '10px', color: C.blue, textDecoration: 'none',
}

// Small ghost control (CSV / Clear / Retry)
function tagBtn(danger = false): React.CSSProperties {
  return {
    fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.04em',
    textTransform: 'uppercase', padding: '3px 8px', border: `1.5px solid ${C.ink}`,
    borderRadius: '3px', background: C.white, color: danger ? C.red : C.ink, cursor: 'pointer',
  }
}

export function Popup() {
  const [aliasData, setAliasData] = useState<AliasData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [open, setOpen]           = useState(true)

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [logOpen, setLogOpen]   = useState(false)

  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [wlOpen, setWlOpen]       = useState(false)
  const [newTerm, setNewTerm]     = useState('')

  // null until the stored setting has been read — avoids flashing the wrong
  // state in the header (and a paused user mistaking the popup for "Active").
  const [enabled, setEnabledState] = useState<boolean | null>(null)
  const [model, setModel] = useState<ModelStatus | null>(null)
  const [pollKey, setPollKey] = useState(0)

  // Alias map - loaded via content script message
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) { setLoading(false); return }
      chrome.tabs.sendMessage(
        tab.id,
        { type: 'GET_CURRENT_ALIASES' } satisfies ContentInboundMessage,
        (response?: CurrentAliasesResponse) => {
          if (chrome.runtime.lastError || !response?.ok) { setLoading(false); return }
          setAliasData({ conversationId: response.conversationId, aliases: response.aliases })
          setLoading(false)
        }
      )
    })
  }, [])

  // Audit log + whitelist + master switch - read through the storage module
  // (no bare keys here)
  useEffect(() => {
    getAuditLog().then(setAuditLog).catch(() => {})
    getWhitelist().then(setWhitelist).catch(() => {})
    getSettings()
      .then(s => setEnabledState(s.enabled))
      .catch(() => setEnabledState(true)) // protected default, never blank
  }, [])

  // Model health. Polls while the model is still coming up so a first-run
  // download that finishes while the popup is open flips to "Ready" live.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    const tick = async () => {
      const status = await queryModelStatus()
      if (cancelled) return
      if (status) {
        setModel(status)
        const settling = status.state === 'loading' || status.state === 'idle'
        if (settling && ++attempts < MODEL_POLL_MAX_ATTEMPTS) {
          timer = setTimeout(tick, MODEL_POLL_MS)
        }
      }
    }
    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [pollKey])

  function clearLog(): void {
    clearAuditLog().then(() => setAuditLog([])).catch(() => {})
  }

  function removeFromWhitelist(term: string): void {
    removeWhitelistTerm(term)
      .then(getWhitelist)
      .then(setWhitelist)
      .catch(() => {})
  }

  function addTerm(): void {
    const term = newTerm.trim()
    if (!term) return
    addWhitelistTerm(term)
      .then(getWhitelist)
      .then(list => { setWhitelist(list); setNewTerm('') })
      .catch(() => {})
  }

  const toggleProtection = useCallback(() => {
    const next = !(enabled ?? true)
    setEnabledState(next) // optimistic: the switch must feel instant
    setEnabled(next).catch(() => setEnabledState(!next))
  }, [enabled])

  const retryModel = useCallback(() => {
    setModel({ state: 'loading' })
    chrome.runtime
      .sendMessage({ type: 'RETRY_MODEL' })
      .catch(() => {})
      .finally(() => setPollKey(k => k + 1))
  }, [])

  const aliasEntries = aliasData
    ? Object.entries(aliasData.aliases).map(([real, placeholder]) => ({ real, placeholder }))
    : []

  const recent = [...auditLog].reverse().slice(0, 20)

  const active = enabled !== false
  const statusColor = enabled === null ? C.ink500 : active ? C.green : C.yellow600
  const statusLabel = enabled === null ? '…' : active ? 'Active' : 'Paused'

  const modelView = model ? MODEL_VIEW[model.state] : null

  const toggleHeader: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
  }

  return (
    <div style={{
      width: '340px', background: C.paper, color: C.ink700, padding: '14px',
      fontFamily: FONT.body, WebkitFontSmoothing: 'antialiased', boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BrandMark size={28} radius={6} />
          <span style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: '22px', letterSpacing: '-0.03em', color: C.ink }}>
            PiiI
          </span>
        </div>
        <span
          role="status"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...monoLabel, color: statusColor }}
        >
          <Dot color={statusColor} />
          {statusLabel}
        </span>
      </div>

      {/* Paused banner: the one state a user must not be able to miss. */}
      {enabled === false && (
        <div
          role="status"
          style={{
            display: 'flex', gap: '9px', alignItems: 'flex-start',
            padding: '10px 12px', marginBottom: '10px',
            border: `2px solid ${C.ink}`, borderRadius: '6px', background: C.yellow100,
            fontSize: '12px', lineHeight: '16px', color: C.ink700,
          }}
        >
          <span aria-hidden style={{ fontSize: '13px', lineHeight: '16px' }}>⏸</span>
          <span>
            <strong>Protection is paused.</strong> Messages are sent without being scanned.
          </span>
        </div>
      )}

      {/* Protection + model health */}
      <div style={{ ...cardStyle, marginBottom: '10px' }}>
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={sectionTitle}>Detection model</span>
            {modelView && (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', ...monoLabel, color: modelView.color }}>
                <Dot color={modelView.color} />
                {modelView.label}
              </span>
            )}
          </div>
          <p style={hintStyle}>
            {modelView ? modelView.hint : 'Checking the on-device model…'}
          </p>
          {model?.state === 'error' && model.error && (
            <p style={{ ...hintStyle, fontFamily: FONT.mono, fontSize: '10px', wordBreak: 'break-word' }}>
              {model.error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            {model?.state === 'error' && (
              <button onClick={retryModel} style={{ ...tagBtn(), flex: 'none' }}>Retry</button>
            )}
            <button
              onClick={toggleProtection}
              style={{
                flex: 1, fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.06em',
                textTransform: 'uppercase', padding: '7px 10px', border: `1.5px solid ${C.ink}`, borderRadius: '4px',
                cursor: 'pointer',
                background: active ? C.white : C.blue,
                color: active ? C.ink : '#fff',
              }}
            >
              {active ? 'Pause protection' : 'Resume protection'}
            </button>
          </div>
        </div>
      </div>

      {/* Alias Map */}
      <div style={{ ...cardStyle, marginBottom: '10px' }}>
        <button style={toggleHeader} onClick={() => setOpen(o => !o)}>
          <span style={sectionTitle}>Alias map</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {aliasEntries.length > 0 && <CountBadge n={aliasEntries.length} />}
            <Chevron open={open} />
          </span>
        </button>
        {open && (
          <div style={{ borderTop: `1.5px solid ${C.ink150}`, padding: '12px' }}>
            {loading ? (
              <p style={{ ...monoLabel, letterSpacing: 0, textTransform: 'none', margin: 0 }}>Loading…</p>
            ) : aliasEntries.length === 0 ? (
              <p style={{ ...monoLabel, letterSpacing: 0, textTransform: 'none', margin: 0 }}>No aliases for this conversation.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ ...monoLabel, textAlign: 'left', paddingBottom: '6px' }}>Alias</th>
                    <th style={{ ...monoLabel, textAlign: 'left', paddingBottom: '6px' }}>Original</th>
                  </tr>
                </thead>
                <tbody>
                  {aliasEntries.map(({ real, placeholder }) => (
                    <tr key={placeholder} style={{ borderTop: `1px solid ${C.ink150}` }}>
                      <td style={{ padding: '6px 8px 6px 0', fontFamily: FONT.mono, fontWeight: 700, color: C.blue, whiteSpace: 'nowrap' }}>{placeholder}</td>
                      <td style={{ padding: '6px 0', color: C.ink700, wordBreak: 'break-all' }}>{real}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div style={{ ...cardStyle, marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: '8px' }}>
          <button
            style={{ ...toggleHeader, padding: 0, flex: 1 }}
            onClick={() => setLogOpen(o => !o)}
          >
            <span style={sectionTitle}>Audit log</span>
            {auditLog.length > 0 && <CountBadge n={auditLog.length} />}
            <span style={{ marginLeft: 'auto' }}><Chevron open={logOpen} /></span>
          </button>
          {auditLog.length > 0 && (
            <>
              <button onClick={() => downloadCSV(auditLog)} style={tagBtn()}>CSV</button>
              <button onClick={clearLog} style={tagBtn(true)}>Clear</button>
            </>
          )}
        </div>
        {logOpen && (
          <div style={{ borderTop: `1.5px solid ${C.ink150}`, padding: '12px' }}>
            {recent.length === 0 ? (
              <p style={{ ...monoLabel, letterSpacing: 0, textTransform: 'none', margin: 0 }}>No audit entries yet.</p>
            ) : (
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recent.map((entry, i) => {
                  const action = ACTION_STYLE[entry.action] ?? ACTION_STYLE.sent_original
                  const classes = entry.classesDetected.join(', ')
                  return (
                    <div key={i} style={{ fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: C.ink, fontWeight: 600 }}>{PLATFORM_LABEL[entry.platform] ?? entry.platform}</span>
                        <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', color: action.color }}>{action.label}</span>
                        <span style={{ marginLeft: 'auto', ...monoLabel, letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>{relativeTime(entry.timestamp)}</span>
                      </div>
                      {(classes || entry.aliasCount > 0) && (
                        <div style={{ color: C.ink500, marginTop: '3px', fontSize: '11px' }}>
                          {classes}{entry.aliasCount > 0
                            ? `${classes ? ' · ' : ''}${entry.aliasCount} alias${entry.aliasCount !== 1 ? 'es' : ''}`
                            : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Whitelist */}
      <div style={cardStyle}>
        <button style={toggleHeader} onClick={() => setWlOpen(o => !o)}>
          <span style={sectionTitle}>Whitelist</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {whitelist.length > 0 && <CountBadge n={whitelist.length} />}
            <Chevron open={wlOpen} />
          </span>
        </button>
        {wlOpen && (
          <div style={{ borderTop: `1.5px solid ${C.ink150}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={hintStyle}>
              Whitelisted terms are never flagged — use this for your own name, company or domain.
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newTerm}
                onChange={e => setNewTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTerm() } }}
                placeholder="Add a term…"
                aria-label="Add a term to the whitelist"
                style={{
                  flex: 1, minWidth: 0, fontFamily: FONT.mono, fontSize: '11px',
                  padding: '5px 7px', border: `1.5px solid ${C.ink150}`, borderRadius: '3px',
                  background: C.paper, color: C.ink, boxSizing: 'border-box',
                }}
              />
              <button onClick={addTerm} style={{ ...tagBtn(), flex: 'none' }} disabled={!newTerm.trim()}>
                Add
              </button>
            </div>
            {whitelist.length === 0 ? (
              <p style={{ ...monoLabel, letterSpacing: 0, textTransform: 'none', margin: 0 }}>No whitelisted terms.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[...whitelist].sort((a, b) => a.term.localeCompare(b.term)).map(entry => (
                  <div key={entry.term} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: C.ink700, wordBreak: 'break-all', marginRight: '8px' }}>{entry.term}</span>
                    <button
                      onClick={() => removeFromWhitelist(entry.term)}
                      style={{ flex: 'none', background: 'transparent', border: 'none', color: C.ink500, cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: '0 2px' }}
                      aria-label={`Remove ${entry.term} from whitelist`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: version, in-extension help, and a way to report a problem.
          Every support path a customer needs is one click from the popup. */}
      <footer style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px',
        fontFamily: FONT.mono, fontSize: '10px', color: C.ink500,
      }}>
        <span>PiiI v{chrome.runtime.getManifest().version}</span>
        <span aria-hidden>·</span>
        <button
          onClick={() => { chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }) }}
          style={linkBtn}
        >
          Setup guide
        </button>
        <a
          href="https://github.com/JaySmith502/PiiI/issues/new"
          target="_blank"
          rel="noreferrer"
          style={{ ...linkBtn, marginLeft: 'auto' }}
        >
          Report a problem
        </a>
      </footer>
    </div>
  )
}
