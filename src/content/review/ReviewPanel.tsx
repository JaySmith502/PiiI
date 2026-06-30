import { useEffect, useRef, useState, useCallback } from 'react'
import type { Detection } from '../../types'
import { CATEGORY_COLORS, DEFAULT_COLOR } from '../highlight/colors'
import { C, FONT, BrandMark, BrandStyle } from '../../brand'

export interface Decision {
  detection: Detection
  accepted: boolean
  alias: string
}

interface ReviewPanelProps {
  detections: Detection[]
  onConfirm: (decisions: Decision[]) => void
  onDismiss: () => void
  // Close without sending anything — leaves the user's text in the input.
  onCancel: () => void
  // Count of values the model flagged but could not be located/masked. When > 0
  // the panel shows a warning and renders even if there are no editable rows.
  warningCount?: number
}

function truncate(text: string, maxLen = 20): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

const labelStyle: React.CSSProperties = {
  fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.14em',
  textTransform: 'uppercase', color: C.ink500, margin: '0 0 9px',
}

export function ReviewPanel({ detections, onConfirm, onDismiss, onCancel, warningCount = 0 }: ReviewPanelProps) {
  const [decisions, setDecisions] = useState<Decision[]>(() =>
    detections.map(d => ({ detection: d, accepted: true, alias: d.alias }))
  )

  const firstInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus first interactive element on mount
  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cancel = close without sending (safe; does not submit).
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter') {
        // Only confirm if focus is not inside an alias input
        const active = document.activeElement
        const isInInput = active instanceof HTMLInputElement && active.dataset.aliasInput === 'true'
        if (!isInInput) {
          e.preventDefault()
          onConfirm(decisions)
        }
      }
    },
    [decisions, onConfirm, onCancel]
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.addEventListener('keydown', handleKeyDown)
    return () => dialog.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus trap: keep Tab inside the dialog
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const FOCUSABLE = 'input, button, [tabindex]:not([tabindex="-1"])'

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    dialog.addEventListener('keydown', trapFocus)
    return () => dialog.removeEventListener('keydown', trapFocus)
  }, [])

  const updateAlias = (index: number, alias: string) => {
    setDecisions(prev =>
      prev.map((d, i) => (i === index ? { ...d, alias } : d))
    )
  }

  const toggleAccepted = (index: number) => {
    setDecisions(prev =>
      prev.map((d, i) => (i === index ? { ...d, accepted: !d.accepted } : d))
    )
  }

  if (detections.length === 0 && warningCount === 0) {
    return null
  }

  const pending = decisions.filter(d => d.accepted).length

  return (
    // Backdrop
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        backgroundColor: 'rgba(20,20,20,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BrandStyle />
      {/* Dialog card */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Review sensitive data"
        style={{
          background: C.white,
          color: C.ink700,
          border: `2px solid ${C.ink}`,
          borderRadius: '10px',
          boxShadow: `7px 7px 0 ${C.ink}`,
          minWidth: '520px',
          maxWidth: '620px',
          width: '100%',
          fontFamily: FONT.body,
          WebkitFontSmoothing: 'antialiased',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          padding: '13px 16px', background: C.paper2, borderBottom: `2px solid ${C.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BrandMark />
            <span style={{
              fontFamily: FONT.mono, fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: C.ink,
            }}>
              PiiI &middot; Review before send
            </span>
          </div>
          <span style={{
            width: '9px', height: '9px', flex: 'none', borderRadius: '999px',
            background: (pending > 0 || warningCount > 0) ? C.red : C.green,
          }} />
        </div>

        {/* Body */}
        <div style={{ padding: '18px 16px 16px' }}>
          {warningCount > 0 && (
            <div
              role="alert"
              style={{
                display: 'flex', gap: '9px', alignItems: 'flex-start',
                padding: '10px 12px', marginBottom: decisions.length > 0 ? '14px' : '4px',
                border: `2px solid ${C.red}`, borderRadius: '6px', background: C.paper2,
              }}
            >
              <span aria-hidden style={{ fontSize: '14px', lineHeight: '18px' }}>⚠</span>
              <span style={{ fontSize: '13px', lineHeight: '18px', color: C.ink700 }}>
                <strong>
                  {warningCount} {warningCount === 1 ? 'value was' : 'values were'} flagged as possible PII but could not be located precisely
                </strong>
                {' '}— {warningCount === 1 ? 'it' : 'they'} will <strong>not</strong> be masked. Review your message, or edit it before sending.
              </span>
            </div>
          )}

          {decisions.length > 0 && (
            <p style={labelStyle}>// Detected &middot; {decisions.length} {decisions.length === 1 ? 'item' : 'items'}</p>
          )}

          {/* Detection rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {decisions.map((decision, i) => {
              const color = CATEGORY_COLORS[decision.detection.category] ?? DEFAULT_COLOR
              const confidencePct = Math.round(decision.detection.confidence * 100)
              const isFirst = i === 0

              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '150px 1fr auto auto auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    border: `1.5px solid ${C.ink150}`,
                    borderRadius: '6px',
                    background: decision.accepted ? C.paper : C.white,
                    opacity: decision.accepted ? 1 : 0.55,
                  }}
                >
                  {/* Alias input */}
                  <input
                    ref={isFirst ? firstInputRef : undefined}
                    data-alias-input="true"
                    className="piiii-input"
                    type="text"
                    value={decision.alias}
                    onChange={(e) => updateAlias(i, e.target.value)}
                  />

                  {/* Detected text */}
                  <span
                    title={decision.detection.text}
                    style={{ fontSize: '13px', color: C.ink700, overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    {truncate(decision.detection.text)}
                  </span>

                  {/* Category chip */}
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.04em',
                      padding: '3px 8px', border: `1.5px solid ${C.ink}`, borderRadius: '3px',
                      background: color.solid, color: color.fg, whiteSpace: 'nowrap',
                    }}
                  >
                    {color.label}
                  </span>

                  {/* Confidence */}
                  <span style={{ fontFamily: FONT.mono, fontSize: '11px', color: C.ink500, whiteSpace: 'nowrap' }}>
                    {confidencePct}%
                  </span>

                  {/* Accept toggle */}
                  <input
                    type="checkbox"
                    checked={decision.accepted}
                    onChange={() => toggleAccepted(i)}
                    aria-label={`Accept substitution for ${decision.detection.text}`}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: C.blue }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer + actions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          padding: '13px 16px', background: C.white, borderTop: `2px solid ${C.ink}`,
        }}>
          <span style={{
            fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: C.ink500,
          }}>
            100% local
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <button className="piiii-btn" onClick={onCancel}>Cancel</button>
            <button className="piiii-btn" onClick={onDismiss}>Send original</button>
            <button className="piiii-btn piiii-btn--primary" onClick={() => onConfirm(decisions)}>
              Redact &amp; send
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
