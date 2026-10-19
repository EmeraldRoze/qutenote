import { HANDWRITING_FONT_FAMILY } from './handwriting/useHandwritingFontFace'

// The five pens from the Oct 15 redesign. "Your handwriting" is the font the
// person built in the handwriting studio; the rest load from Google Fonts
// (linked in index.html). Each pen writes at its own natural size.

export interface Pen {
  value: string
  label: string
  family: string
  italic?: boolean
  size: number // note text size in px, per the design spec
}

export const HANDWRITING_PEN: Pen = {
  value: 'YOUR_HANDWRITING',
  label: 'You',
  family: `'${HANDWRITING_FONT_FAMILY}', 'Fraunces', serif`,
  size: 19,
}

export const PENS: Pen[] = [
  { value: 'FRAUNCES', label: 'Fraunces', family: "'Fraunces', serif", italic: true, size: 23 },
  { value: 'SORA', label: 'Sora', family: "'Sora', sans-serif", size: 19 },
  { value: 'DM_MONO', label: 'DM Mono', family: "'DM Mono', monospace", size: 17 },
  { value: 'ROCK_SALT', label: 'Rock Salt', family: "'Rock Salt', cursive", size: 16 },
  // Emerald's cipher — renders through encodeSecret() (lib/secret.ts)
  { value: 'SECRET', label: 'Secret 🤫', family: "'QuteNoteSecret'", size: 22 },
]

const ALL: Pen[] = [HANDWRITING_PEN, ...PENS]

export function penByValue(value?: string | null): Pen {
  return ALL.find((p) => p.value === value) ?? PENS[0]
}

// Inline style for text written in a pen (note card, preview, feed).
export function penStyle(value?: string | null): React.CSSProperties {
  const pen = penByValue(value)
  return {
    fontFamily: pen.family,
    fontStyle: pen.italic ? 'italic' : 'normal',
    fontSize: `${pen.size}px`,
  }
}

export const DEFAULT_PEN = 'FRAUNCES'
