import opentype from 'opentype.js'
import { getStroke } from 'perfect-freehand'
import { parseAltKey, altCodepoint, jitterStrokes, MAX_ALTS } from './variants'

// Turns captured pen strokes into a real, installable font.
//
// The part that isn't obvious: a font glyph has to be a FILLED shape, not a
// thin line — if you hand a font-builder a one-pixel-wide path, it renders
// as invisible once filled. perfect-freehand solves this by turning a
// recorded pen stroke into the actual inked outline a real pen would leave
// (with natural taper at the ends), which is exactly what a glyph needs to
// be. We then hand that outline to opentype.js to pack into a real TTF file.
//
// People don't draw on a type designer's grid: letters land at different
// heights and sizes inside the box, and a j drawn fully above the guide line
// would never descend. So before outlining, every glyph is normalized to the
// typographic band its character belongs to — bottom snapped to the baseline
// (or pushed below it for descenders), height scaled to its class — which is
// what makes a whole note read as one steady hand.

export type Point = { x: number; y: number }
export type Stroke = Point[]
export type GlyphStrokes = Record<string, Stroke[]> // character -> its strokes

const CANVAS_SIZE = 300 // the writing box is CANVAS_SIZE x CANVAS_SIZE px
const BASELINE_Y = 220 // where the letter "sits"; room above for ascenders, below for descenders
const UNITS_PER_EM = 1000
const SCALE = UNITS_PER_EM / CANVAS_SIZE
const SIDE_BEARING = 30 // breathing room on either side of a letter — tight, so words read as words
const SPACE_ADVANCE = 340 // a space must look clearly wider than any letter gap, or words run together

// Bump this when glyph processing changes — saved fonts recompile from their
// stored strokes the next time the handwriting page loads.
// v3 (Oct 18): much stronger de-shake per Emerald — "it shouldn't look like
// it was written on a phone."
// v4 (Oct 18): size-consistency tuning — t rides lower than b/d/h/k/l (real
// typography agrees), and wide letters (w, m) get a nudge up so they don't
// read small.
// v5 (Oct 18): letter VARIATIONS — every letter carries up to two alternates
// (real captured takes, or synthesized wobble) at PUA codepoints; rendered
// notes cycle them so repeated letters never look identical.
export const FONT_COMPILER_VERSION = 5

// Typographic band heights, in canvas px relative to the baseline.
const X_HEIGHT = 114 // a c e m n o …
const ASC_HEIGHT = 198 // b d f h k l t
const CAP_HEIGHT = 195 // A-Z, 0-9, ! ?
const DOT_HEIGHT = 186 // i and j measured through the dot on top
const DESC_DEPTH = 72 // how far g j p q y hang below the line

interface BandSpec {
  top?: number // canvas y the glyph's top should land on
  bottom?: number // canvas y the glyph's bottom should land on
  center?: number // vertical midpoint, for marks like the hyphen
  stretch: boolean // scale the drawing to fill the band (false = position only)
}

function bandFor(char: string): BandSpec {
  const BL = BASELINE_Y
  if (char === 'i') return { top: BL - DOT_HEIGHT, bottom: BL, stretch: true }
  if (char === 'j') return { top: BL - DOT_HEIGHT, bottom: BL + DESC_DEPTH, stretch: true }
  // t's ascender is traditionally shorter than b/d/h/k/l — full height made
  // it look oversized next to its neighbors (Emerald, Oct 18)
  if (char === 't') return { top: BL - Math.round(ASC_HEIGHT * 0.8), bottom: BL, stretch: true }
  // wide letters read smaller than they measure — give them a nudge
  if ('wm'.includes(char)) return { top: BL - Math.round(X_HEIGHT * 1.1), bottom: BL, stretch: true }
  if ('gpqy'.includes(char)) return { top: BL - X_HEIGHT, bottom: BL + DESC_DEPTH, stretch: true }
  if ('bdfhkl'.includes(char)) return { top: BL - ASC_HEIGHT, bottom: BL, stretch: true }
  if (/[a-z]/.test(char)) return { top: BL - X_HEIGHT, bottom: BL, stretch: true }
  if (/[A-Z0-9!?]/.test(char)) return { top: BL - CAP_HEIGHT, bottom: BL, stretch: true }
  if (char === '.') return { bottom: BL, stretch: false }
  if (char === ',') return { top: BL - 10, stretch: false }
  if (char === "'") return { top: BL - CAP_HEIGHT, stretch: false }
  if (char === '-') return { center: BL - X_HEIGHT * 0.5, stretch: false }
  return { bottom: BL, stretch: false }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// Scale + shift a glyph's raw strokes into its character's band, and start
// its ink at x=0 (the drawn position inside the box carries no meaning).
function normalizeStrokes(char: string, strokes: Stroke[]): Stroke[] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const stroke of strokes) for (const p of stroke) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  if (!Number.isFinite(minX)) return strokes

  const band = bandFor(char)
  const drawnHeight = maxY - minY
  let s = 1
  if (band.stretch && band.top !== undefined && band.bottom !== undefined && drawnHeight >= 8) {
    s = clamp((band.bottom - band.top) / drawnHeight, 0.35, 6)
  }
  let dy: number
  if (band.bottom !== undefined) dy = band.bottom - maxY * s
  else if (band.top !== undefined) dy = band.top - minY * s
  else dy = (band.center ?? BASELINE_Y) - ((minY + maxY) / 2) * s
  const dx = -minX * s

  return strokes.map((stroke) => stroke.map((p) => ({ x: p.x * s + dx, y: p.y * s + dy })))
}

// Even out the raw pointer samples before inking: resample to a steady
// spacing, then relax the wobble out. Shaky input is what made letters
// look jagged no matter how the outline was drawn.
function resample(stroke: Stroke, spacing = 3): Stroke {
  if (stroke.length < 3) return stroke
  const out: Stroke = [stroke[0]]
  let last = stroke[0]
  for (const p of stroke.slice(1)) {
    let d = Math.hypot(p.x - last.x, p.y - last.y)
    while (d >= spacing) {
      const t = spacing / d
      last = { x: last.x + (p.x - last.x) * t, y: last.y + (p.y - last.y) * t }
      out.push(last)
      d = Math.hypot(p.x - last.x, p.y - last.y)
    }
  }
  out.push(stroke[stroke.length - 1])
  return out
}

function relax(stroke: Stroke, passes = 2): Stroke {
  let pts = stroke
  for (let n = 0; n < passes; n++) {
    if (pts.length < 5) break
    const next: Stroke = [pts[0]]
    for (let i = 1; i < pts.length - 1; i++) {
      next.push({
        x: (pts[i - 1].x + 2 * pts[i].x + pts[i + 1].x) / 4,
        y: (pts[i - 1].y + 2 * pts[i].y + pts[i + 1].y) / 4,
      })
    }
    next.push(pts[pts.length - 1])
    pts = next
  }
  return pts
}

function toFontSpace(p: Point): Point {
  // Canvas Y grows downward; font space Y grows upward from the baseline.
  return { x: p.x * SCALE + SIDE_BEARING, y: (BASELINE_Y - p.y) * SCALE }
}

function strokeToPath(path: opentype.Path, stroke: Stroke) {
  if (stroke.length === 0) return
  // A tap with no drag — same convention as the preview canvas: a small dot
  // (the tittle on an i/j, a period), not nothing.
  if (stroke.length === 1) {
    const c = toFontSpace(stroke[0])
    const r = 24
    path.moveTo(c.x + r, c.y)
    path.curveTo(c.x + r, c.y + r * 0.55, c.x + r * 0.55, c.y + r, c.x, c.y + r)
    path.curveTo(c.x - r * 0.55, c.y + r, c.x - r, c.y + r * 0.55, c.x - r, c.y)
    path.curveTo(c.x - r, c.y - r * 0.55, c.x - r * 0.55, c.y - r, c.x, c.y - r)
    path.curveTo(c.x + r * 0.55, c.y - r, c.x + r, c.y - r * 0.55, c.x + r, c.y)
    path.close()
    return
  }
  const cleaned = relax(resample(stroke, 4), 4)
  const outline = getStroke(cleaned.map((p) => [p.x, p.y]), {
    size: 14, // pen thickness in canvas px — a confident, visible stroke
    thinning: 0.35, // tapers at stroke ends, like a real pen lifting off
    smoothing: 0.9,
    streamline: 0.72,
  })
  if (outline.length < 3) return
  // Midpoint quadratic curves instead of straight segments between outline
  // points — this is what turns "connect the dots" edges into pen-smooth ones.
  const fp = outline.map(([x, y]) => toFontSpace({ x, y }))
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const start = mid(fp[fp.length - 1], fp[0])
  path.moveTo(start.x, start.y)
  for (let i = 0; i < fp.length; i++) {
    const m = mid(fp[i], fp[(i + 1) % fp.length])
    path.quadTo(fp[i].x, fp[i].y, m.x, m.y)
  }
  path.close()
}

function glyphPath(char: string, rawStrokes: Stroke[]): { path: opentype.Path; advanceWidth: number } {
  const strokes = normalizeStrokes(char, rawStrokes)
  const path = new opentype.Path()
  let maxX = 0
  for (const stroke of strokes) {
    strokeToPath(path, stroke)
    for (const p of stroke) maxX = Math.max(maxX, p.x)
  }
  const advanceWidth = Math.max(maxX * SCALE + SIDE_BEARING * 2, 170)
  return { path, advanceWidth }
}

// A blank glyph — used for the required .notdef and as a plain space.
function blankGlyph(unicode: number | undefined, name: string, advanceWidth: number): opentype.Glyph {
  return new opentype.Glyph({ name, unicode, advanceWidth, path: new opentype.Path() })
}

export function compileFont(fontName: string, glyphs: GlyphStrokes): ArrayBuffer {
  const notdef = blankGlyph(undefined, '.notdef', 300)
  const space = blankGlyph(32, 'space', SPACE_ADVANCE)
  const builtGlyphs: opentype.Glyph[] = [notdef, space]

  const realAlts: Record<string, Set<number>> = {}

  for (const [key, strokes] of Object.entries(glyphs)) {
    if (!strokes?.length) continue
    const alt = parseAltKey(key)
    if (alt) {
      // A real alternate take of this letter → PUA glyph
      const cp = altCodepoint(alt.char, alt.n)
      if (cp === null) continue
      const { path, advanceWidth } = glyphPath(alt.char, strokes)
      builtGlyphs.push(new opentype.Glyph({ name: `uni${cp.toString(16)}`, unicode: cp, advanceWidth, path }))
      ;(realAlts[alt.char] ??= new Set()).add(alt.n)
      continue
    }
    const unicode = key.codePointAt(0)
    if (unicode === undefined) continue
    const { path, advanceWidth } = glyphPath(key, strokes)
    builtGlyphs.push(new opentype.Glyph({ name: `uni${unicode.toString(16)}`, unicode, advanceWidth, path }))
  }

  // Fill the empty alternate slots with synthesized wobble so every letter
  // has a full family of three looks.
  for (const [char, strokes] of Object.entries(glyphs)) {
    if (!strokes?.length || parseAltKey(char)) continue
    for (let n = 1; n <= MAX_ALTS; n++) {
      if (realAlts[char]?.has(n)) continue
      const cp = altCodepoint(char, n)
      if (cp === null) continue
      const { path, advanceWidth } = glyphPath(char, jitterStrokes(strokes, char.codePointAt(0)! * 10 + n))
      builtGlyphs.push(new opentype.Glyph({ name: `uni${cp.toString(16)}`, unicode: cp, advanceWidth, path }))
    }
  }

  // The comma's strokes double as the apostrophe — people only draw one.
  // Same ink, repositioned up by the apostrophe's own band.
  const commaStrokes = glyphs[',']
  if (commaStrokes?.length && !glyphs["'"]?.length) {
    const unicode = "'".codePointAt(0)!
    const { path, advanceWidth } = glyphPath("'", commaStrokes)
    builtGlyphs.push(new opentype.Glyph({ name: `uni${unicode.toString(16)}`, unicode, advanceWidth, path }))
  }

  const font = new opentype.Font({
    familyName: fontName,
    styleName: 'Regular',
    unitsPerEm: UNITS_PER_EM,
    ascender: Math.round(ASC_HEIGHT * SCALE) + 20,
    descender: -(Math.round(DESC_DEPTH * SCALE) + 20),
    glyphs: builtGlyphs,
  })

  return font.toArrayBuffer()
}

export const HANDWRITING_CANVAS_SIZE = CANVAS_SIZE
export const HANDWRITING_BASELINE_Y = BASELINE_Y
