// 10x Web Development design system — shared tokens for PiiI's UI surfaces.
// Hex values mirror 10xStudio Redesign/ds/tokens/colors.css. Content-script
// surfaces (review box, scan modal) inline these so they never depend on the
// host page's CSS or on a web-font fetch the host CSP might block — fonts
// degrade through the fallback stacks below.

export const C = {
  blue: '#1B81CE', blue100: '#D6EAF8',
  red: '#ED3B2F', red100: '#FBD8D5',
  yellow: '#FFC400', yellow600: '#E0A800', yellow100: '#FFF1C2',
  ink: '#141414', ink700: '#353535', ink600: '#525252', ink500: '#6E6E6E',
  ink200: '#DDDCD7', ink150: '#E7E6E0', ink100: '#EFEEE8',
  paper: '#FAF9F4', paper2: '#F2F1EA', white: '#FFFFFF',
  green: '#1F9D55',
} as const

export const FONT = {
  display: "'Jost','Archivo','Futura','Century Gothic',system-ui,sans-serif",
  body: "'Archivo',system-ui,-apple-system,sans-serif",
  mono: "'JetBrains Mono','SFMono-Regular',ui-monospace,monospace",
} as const

export const EASE = 'cubic-bezier(0.2,0.7,0.2,1)'

// Bauhaus well-block mark. Inlined so content scripts need no web-accessible asset.
export function BrandMark({ size = 22, radius = 4 }: { size?: number; radius?: number }) {
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="10x"
      style={{ display: 'block', flex: 'none', border: `1.5px solid ${C.ink}`, borderRadius: radius }}
    >
      <rect x="0" y="0" width="50" height="50" fill={C.blue} />
      <rect x="50" y="0" width="50" height="50" fill={C.red} />
      <rect x="0" y="50" width="50" height="50" fill={C.yellow} />
      <rect x="50" y="50" width="50" height="50" fill={C.ink} />
      <circle cx="25" cy="25" r="9" fill={C.yellow} />
      <circle cx="75" cy="25" r="9" fill={C.blue} />
      <circle cx="25" cy="75" r="9" fill={C.red} />
      <circle cx="75" cy="75" r="9" fill={C.yellow} />
    </svg>
  )
}

// Hard-block-shadow buttons. :hover/:active can't be inlined, so surfaces that
// use these render <BrandStyle/> once to inject the rules.
export const CONTROL_CSS = `
.piiii-btn{display:inline-flex;align-items:center;gap:7px;font-family:${FONT.display};font-weight:800;font-size:13px;letter-spacing:-.01em;height:38px;padding:0 16px;border:2px solid ${C.ink};border-radius:7px;background:transparent;color:${C.ink};cursor:pointer;transition:transform .12s ${EASE},box-shadow .12s ${EASE};white-space:nowrap;}
.piiii-btn:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 ${C.ink};}
.piiii-btn:active{transform:none;box-shadow:none;}
.piiii-btn--primary{background:${C.blue};color:#fff;}
.piiii-btn--warn{background:${C.yellow};color:${C.ink};}
.piiii-btn:focus-visible{outline:3px solid ${C.blue};outline-offset:2px;}
.piiii-input{font-family:${FONT.mono};font-size:12px;background:${C.white};border:1.5px solid ${C.ink200};border-radius:3px;color:${C.ink};padding:4px 7px;width:100%;box-sizing:border-box;}
.piiii-input:focus{outline:none;border-color:${C.blue};box-shadow:0 0 0 2px ${C.blue100};}
`

export function BrandStyle() {
  return <style dangerouslySetInnerHTML={{ __html: CONTROL_CSS }} />
}
