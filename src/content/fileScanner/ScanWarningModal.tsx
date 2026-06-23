import { useEffect, useRef, useCallback } from 'react'
import { C, FONT, BrandMark, BrandStyle } from '../../brand'

interface ScanWarningModalProps {
  fileName: string
  classCounts: Record<string, number>  // category → count
  truncated: boolean
  multiFile: boolean
  scanFailed?: boolean  // true when the file couldn't be parsed at all
  onProceed: () => void
  onCancel: () => void
}

// Friendly display names for detection categories
const CATEGORY_LABEL: Record<string, string> = {
  name:        'Person name',
  address:     'Address',
  email:       'Email address',
  phone:       'Phone number',
  ssn:         'SSN',
  credit_card: 'Credit card',
  api_key:     'API key',
  account_id:  'Account ID',
  date:        'Date',
  url:         'URL',
}

function truncateName(name: string, max = 60): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

const noteStyle: React.CSSProperties = {
  fontFamily: FONT.mono, fontSize: '11px', color: C.ink500, margin: '0 0 8px', lineHeight: 1.55,
}

export function ScanWarningModal({
  fileName,
  classCounts,
  truncated,
  multiFile,
  scanFailed = false,
  onProceed,
  onCancel,
}: ScanWarningModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Initial focus on Cancel (safer default)
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [onCancel]
  )

  // Escape key
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.addEventListener('keydown', handleKeyDown)
    return () => dialog.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const FOCUSABLE = 'input, button, [tabindex]:not([tabindex="-1"])'
    const trap = (e: KeyboardEvent) => {
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
    dialog.addEventListener('keydown', trap)
    return () => dialog.removeEventListener('keydown', trap)
  }, [])

  const entries = Object.entries(classCounts)

  return (
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
      {/* No backdrop click-to-dismiss - security warning requires explicit Cancel or Upload choice */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-warning-title"
        style={{
          background: C.white,
          color: C.ink700,
          border: `2px solid ${C.ink}`,
          borderRadius: '10px',
          boxShadow: `7px 7px 0 ${C.ink}`,
          minWidth: '420px',
          maxWidth: '520px',
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
              PiiI &middot; {scanFailed ? 'Scan failed' : 'File warning'}
            </span>
          </div>
          <span style={{ width: '9px', height: '9px', flex: 'none', borderRadius: '999px', background: C.red }} />
        </div>

        {/* Body */}
        <div style={{ padding: '18px 16px 16px' }}>
          <h2 id="scan-warning-title" style={{
            fontFamily: FONT.display, fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em',
            color: C.ink, margin: '0 0 4px', lineHeight: 1.1,
          }}>
            {scanFailed ? "Couldn't scan this file for PII" : 'PII detected in this file'}
          </h2>
          <p style={{ fontFamily: FONT.mono, fontSize: '12px', color: C.ink500, margin: '0 0 16px', wordBreak: 'break-all' }}>
            {truncateName(fileName)}
          </p>

          {scanFailed && (
            <p style={{ fontSize: '14px', color: C.ink700, margin: '0 0 18px', lineHeight: 1.55 }}>
              PiiI could not read this file, so it may contain sensitive data that
              was not checked. Upload only if you trust its contents.
            </p>
          )}

          {/* Notes */}
          {!scanFailed && truncated && (
            <p style={noteStyle}>Note: only the first ~50,000 characters were scanned.</p>
          )}
          {multiFile && (
            <p style={noteStyle}>Additional files in this selection were not scanned.</p>
          )}

          {/* Detection counts */}
          {!scanFailed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {entries.map(([category, count]) => (
                <div
                  key={category}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', border: `1.5px solid ${C.ink150}`, borderRadius: '6px',
                    background: C.paper,
                  }}
                >
                  <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: '14px', color: C.ink }}>
                    {CATEGORY_LABEL[category] ?? category.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: '12px', color: C.red }}>
                    {count} {count === 1 ? 'instance' : 'instances'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer + actions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '9px',
          padding: '13px 16px', background: C.white, borderTop: `2px solid ${C.ink}`,
        }}>
          <button ref={cancelRef} className="piiii-btn" onClick={onCancel}>Cancel upload</button>
          <button className="piiii-btn piiii-btn--warn" onClick={onProceed}>Upload anyway</button>
        </div>
      </div>
    </div>
  )
}
