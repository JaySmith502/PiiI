import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import type { Detection } from '../../types'
import { ReviewPanel } from './ReviewPanel'
import type { Decision } from './ReviewPanel'

export type { Decision } from './ReviewPanel'

export class ReviewManager {
  private root: ReturnType<typeof createRoot> | null = null
  private container: HTMLElement | null = null

  show(
    detections: Detection[],
    onConfirm: (decisions: Decision[]) => void,
    onDismiss: () => void,
    onCancel: () => void,
  ): void {
    this.hide()

    const container = document.createElement('div')
    container.setAttribute('data-piiii-review', 'true')
    document.body.appendChild(container)
    this.container = container

    this.root = createRoot(container)
    this.root.render(
      createElement(ReviewPanel, { detections, onConfirm, onDismiss, onCancel })
    )
  }

  hide(): void {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }
}
