import { useEffect, useRef } from 'react'
import type { Detection } from '../../types'
import { CATEGORY_COLORS, DEFAULT_COLOR } from './colors'
import { mirrorStyles, getScrollOffset } from './utils'

interface OverlayProps {
  text: string
  detections: Detection[]
  inputEl: HTMLElement
  onTermRightClick?: (term: string) => void
}

interface Segment {
  text: string
  detection: Detection | null
}

function buildSegments(text: string, detections: Detection[]): Segment[] {
  const segments: Segment[] = []
  // Sort detections by start offset
  const sorted = [...detections].sort((a, b) => a.span[0] - b.span[0])
  let cursor = 0

  for (const detection of sorted) {
    const [start, end] = detection.span
    if (end <= cursor) continue  // skip already-consumed span
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), detection: null })
    }
    segments.push({ text: text.slice(start, end), detection })
    cursor = end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), detection: null })
  }

  return segments
}

export function Overlay({ text, detections, inputEl, onTermRightClick }: OverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Mirror font/layout styles and sync scroll
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    mirrorStyles(inputEl, el)

    function syncScroll() {
      if (!el) return
      const { top, left } = getScrollOffset(inputEl)
      el.scrollTop = top
      el.scrollLeft = left
    }

    syncScroll()
    inputEl.addEventListener('scroll', syncScroll)
    return () => {
      inputEl.removeEventListener('scroll', syncScroll)
    }
  }, [inputEl, text, detections])

  const segments = buildSegments(text, detections)

  return (
    <div
      ref={overlayRef}
      className="piiii-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        color: 'transparent',
        overflow: 'auto',
        scrollbarWidth: 'none' as const,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: 'transparent',
        margin: 0,
      }}
    >
      {segments.map((seg, i) => {
        if (!seg.detection) {
          return <span key={i}>{seg.text}</span>
        }
        const color = CATEGORY_COLORS[seg.detection.category] ?? DEFAULT_COLOR
        const confidencePct = Math.round(seg.detection.confidence * 100)
        const tooltipText = `${color.label} (${confidencePct}%)`
        return (
          <mark
            key={i}
            title={tooltipText}
            onContextMenu={(e) => {
              e.stopPropagation()
              onTermRightClick?.(seg.detection!.text)
            }}
            style={{
              backgroundColor: color.bg,
              outline: `1px solid ${color.border}`,
              borderRadius: '2px',
              color: 'transparent',
              pointerEvents: 'auto',
              cursor: 'default',
            }}
          >
            {seg.text}
          </mark>
        )
      })}
    </div>
  )
}
