const MIRROR_PROPS = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'letterSpacing', 'lineHeight', 'textIndent',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'boxSizing', 'wordWrap', 'overflowWrap', 'tabSize', 'textTransform',
] as const

export function mirrorStyles(source: HTMLElement, target: HTMLElement): void {
  const cs = window.getComputedStyle(source)
  for (const prop of MIRROR_PROPS) {
    // Use setProperty via camelCase-to-kebab conversion to avoid TS readonly complaints
    const kebab = prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    target.style.setProperty(kebab, cs.getPropertyValue(kebab))
  }
}

export function getScrollOffset(el: HTMLElement): { top: number; left: number } {
  return { top: el.scrollTop, left: el.scrollLeft }
}
