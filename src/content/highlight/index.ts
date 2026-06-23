import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import type { Detection } from '../../types'
import { Overlay } from './Overlay'

export class HighlightManager {
  private root: ReturnType<typeof createRoot> | null = null
  private container: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null
  private inputEl: HTMLElement | null = null
  private scrollListener: (() => void) | null = null

  mount(inputEl: HTMLElement): void {
    if (this.container) this.unmount()

    this.inputEl = inputEl

    // Inject WebKit scrollbar-hide style once
    if (!document.getElementById('piiii-highlight-style')) {
      const style = document.createElement('style')
      style.id = 'piiii-highlight-style'
      style.textContent = '.piiii-overlay::-webkit-scrollbar { display: none }'
      document.head.appendChild(style)
    }

    const container = document.createElement('div')
    container.setAttribute('data-piiii-overlay', 'true')
    container.style.position = 'fixed'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '2147483647'
    container.style.overflow = 'hidden'

    this.positionContainer(container, inputEl)
    document.body.appendChild(container)
    this.container = container

    this.root = createRoot(container)
    this.renderOverlay('', [], inputEl)

    this.resizeObserver = new ResizeObserver(() => {
      if (this.container && this.inputEl) {
        this.positionContainer(this.container, this.inputEl)
      }
    })
    this.resizeObserver.observe(inputEl)

    this.scrollListener = () => {
      if (this.container && this.inputEl) {
        this.positionContainer(this.container, this.inputEl)
      }
    }
    window.addEventListener('scroll', this.scrollListener, { passive: true })
  }

  update(text: string, detections: Detection[], onTermRightClick?: (term: string) => void): void {
    if (!this.root || !this.inputEl) return
    this.renderOverlay(text, detections, this.inputEl, onTermRightClick)
  }

  unmount(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null

    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener)
      this.scrollListener = null
    }

    if (this.root) {
      this.root.unmount()
      this.root = null
    }

    if (this.container) {
      this.container.remove()
      this.container = null
    }

    this.inputEl = null
  }

  private positionContainer(container: HTMLElement, inputEl: HTMLElement): void {
    const rect = inputEl.getBoundingClientRect()
    container.style.top = `${rect.top}px`
    container.style.left = `${rect.left}px`
    container.style.width = `${rect.width}px`
    container.style.height = `${rect.height}px`
  }

  private renderOverlay(text: string, detections: Detection[], inputEl: HTMLElement, onTermRightClick?: (term: string) => void): void {
    this.root!.render(
      createElement(Overlay, { text, detections, inputEl, onTermRightClick })
    )
  }
}
