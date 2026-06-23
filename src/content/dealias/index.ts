import type { AliasMap } from '../../types'

export class DealiasEngine {
  private observer: MutationObserver | null = null
  private inverseMap: Record<string, string> = {}  // placeholder → realValue
  private processing = false

  /** Start observing the response container and de-aliasing streamed text */
  start(responseEl: HTMLElement, aliasMap: AliasMap): void {
    this.stop()  // clean up any existing observer

    // Build inverse map: "[PERSON_1]" → "John Smith"
    this.inverseMap = Object.fromEntries(
      Object.entries(aliasMap.aliases).map(([real, placeholder]) => [placeholder, real])
    )

    if (Object.keys(this.inverseMap).length === 0) return  // nothing to de-alias

    // Do a one-time pass on existing content first
    this.processNode(responseEl)

    // Then observe for new content as the AI streams
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          this.processTextNode(mutation.target as Text)
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => this.processNode(node))
        }
      }
    })

    this.observer.observe(responseEl, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: false,
    })
  }

  stop(): void {
    this.observer?.disconnect()
    this.observer = null
    this.inverseMap = {}
  }

  private processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      this.processTextNode(node as Text)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Walk all text nodes in the subtree
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
      let textNode: Text | null
      while ((textNode = walker.nextNode() as Text | null) !== null) {
        this.processTextNode(textNode)
      }
    }
  }

  private processTextNode(node: Text): void {
    if (this.processing) return
    let text = node.textContent ?? ''
    let changed = false
    for (const [placeholder, real] of Object.entries(this.inverseMap)) {
      if (text.includes(placeholder)) {
        text = text.replaceAll(placeholder, real)
        changed = true
      }
    }
    if (changed) {
      this.processing = true
      node.textContent = text
      this.processing = false
    }
  }
}
