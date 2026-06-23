// PII category colors — 10x design system 4-color categorical map (spec §04).
// Ten categories group into four brand colors; color is a categorical hint, not
// a unique ID. `solid` fills alias chips/badges; `bg`/`border` tint the in-page
// highlight overlay (translucent so it reads on light and dark host pages).
export interface CategoryColor {
  bg: string      // translucent overlay tint
  border: string  // overlay outline
  solid: string   // chip / badge fill
  fg: string      // text on the solid fill
  label: string
}

const BLUE:   Omit<CategoryColor, 'label'> = { bg: 'rgba(27,129,206,0.22)', border: '#1B81CE', solid: '#1B81CE', fg: '#FFFFFF' }
const RED:    Omit<CategoryColor, 'label'> = { bg: 'rgba(237,59,47,0.22)',  border: '#ED3B2F', solid: '#ED3B2F', fg: '#FFFFFF' }
const YELLOW: Omit<CategoryColor, 'label'> = { bg: 'rgba(255,196,0,0.30)',  border: '#E0A800', solid: '#FFC400', fg: '#141414' }
const INK:    Omit<CategoryColor, 'label'> = { bg: 'rgba(53,53,53,0.22)',   border: '#353535', solid: '#353535', fg: '#FFFFFF' }

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  name:        { ...RED,    label: 'NAME' },
  ssn:         { ...RED,    label: 'SSN' },
  credit_card: { ...RED,    label: 'CC' },
  email:       { ...BLUE,   label: 'EMAIL' },
  address:     { ...BLUE,   label: 'ADDRESS' },
  phone:       { ...YELLOW, label: 'PHONE' },
  account_id:  { ...YELLOW, label: 'ACCOUNT ID' },
  date:        { ...YELLOW, label: 'DATE' },
  api_key:     { ...INK,    label: 'API KEY' },
  url:         { ...INK,    label: 'URL' },
}

export const DEFAULT_COLOR: CategoryColor = { ...INK, label: 'PII' }
