import { useState, useEffect } from 'react'
import type { AuditEntry, WhitelistEntry } from '../types'
import {
  getAuditLog,
  getWhitelist,
  clearAuditLog,
  removeFromWhitelist as removeWhitelistTerm,
} from '../background/storage'
import type { ContentInboundMessage, CurrentAliasesResponse } from '../background/messages'
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

// Small ghost control (CSV / Clear)
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

  // Audit log + whitelist - read through the storage module (no bare keys here)
  useEffect(() => {
    getAuditLog().then(setAuditLog).catch(() => {})
  }, [])

  useEffect(() => {
    getWhitelist().then(setWhitelist).catch(() => {})
  }, [])

  function clearLog(): void {
    clearAuditLog().then(() => setAuditLog([])).catch(() => {})
  }

  function removeFromWhitelist(term: string): void {
    removeWhitelistTerm(term)
      .then(getWhitelist)
      .then(setWhitelist)
      .catch(() => {})
  }

  const aliasEntries = aliasData
    ? Object.entries(aliasData.aliases).map(([real, placeholder]) => ({ real, placeholder }))
    : []

  const recent = [...auditLog].reverse().slice(0, 20)

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
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          ...monoLabel, color: C.green,
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: C.green }} />
          Active
        </span>
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
          <div style={{ borderTop: `1.5px solid ${C.ink150}`, padding: '12px' }}>
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
    </div>
  )
}
