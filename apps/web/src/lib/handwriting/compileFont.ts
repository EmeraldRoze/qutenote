import opentype from 'opentype.js'
import { getStroke } from 'perfect-freehand'

// Turns captured pen strokes into a real, installable font.
//
// The part that isn't obvious: a font glyph has to be a FILLED shape, not a
// thin line — if you hand a font-builder a one-pixel-wide path, it renders
// as invisible once filled. perfect-freehand solves this by turning a
// recorded pen stroke into the actual inked outline a real pen would leave
// (with natural taper at the ends), which is exactly what a glyph needs to
// be. We then hand that outline to opentype.js to pack into a real TTF file.

export type Point = { x: number; y: number }
export type Stroke = Point[]
export type GlyphStrokes = Record<string, Stroke[]> // character -> its strokes

const CANVAS_SIZE = 300 // the writing box is CANVAS_SIZE x CANVAS_SIZE px
const BASELINE_Y = 220 // where the letter "sits"; room above for ascenders, below for descenders
const UNITS_PER_EM = 1000
const SCALE = UNITS_PER_EM / CANVAS_SIZE
const SIDE_BEARING = 70 // breathing room on either side of a letter

function toFontSpace(p: Point): Point {
  // Canvas Y grows downward; font space Y grows upward from the baseline.
  return { x: p.x * SCALE, y: (BASELINE_Y - p.y) * SCALE }
}

function strokeToPath(path: opentype.Path, stroke: Stroke) {
  if (stroke.length < 2) return
  const outline = getStroke(stroke.map((p) => [p.x, p.y]), {
    size: 14, // pen thickness in canvas px — a confident, visible stroke
    thinning: 0.5, // tapers at stroke ends, like a real pen lifting off
    smoothing: 0.5,
    streamline: 0.5,
  })
  if (outline.length < 3) return
  const first = toFontSpace({ x: outline[0][0], y: outline[0][1] })
  path.moveTo(first.x, first.y)
  for (const [x, y] of outline.slice(1)) {
    const fp = toFontSpace({ x, y })
    path.lineTo(fp.x, fp.y)
  }
  path.close()
}

function glyphPath(strokes: Stroke[]): { path: opentype.Path; advanceWidth: number } {
  const path = new opentype.Path()
  let minX = Infinity
  let maxX = -Infinity
  for (const stroke of strokes) {
    strokeToPath(path, stroke)
    for (const p of stroke) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
    }
  }
  const inkWidth = Number.isFinite(minX) ? (maxX - minX) * SCALE : 0
  const advanceWidth = Math.max(inkWidth + SIDE_BEARING * 2, 260)
  return { path, advanceWidth }
}

// A blank glyph — used for the required .notdef and as a plain space.
function blankGlyph(unicode: number | undefined, name: string, advanceWidth: number): opentype.Glyph {
  return new opentype.Glyph({ name, unicode, advanceWidth, path: new opentype.Path() })
}

export function compileFont(fontName: string, glyphs: GlyphStrokes): ArrayBuffer {
  const notdef = blankGlyph(undefined, '.notdef', 300)
  const space = blankGlyph(32, 'space', 260)
  const builtGlyphs: opentype.Glyph[] = [notdef, space]

  for (const [char, strokes] of Object.entries(glyphs)) {
    if (!strokes?.length) continue
    const unicode = char.codePointAt(0)
    if (unicode === undefined) continue
    const { path, advanceWidth } = glyphPath(strokes)
    builtGlyphs.push(new opentype.Glyph({ name: `uni${unicode.toString(16)}`, unicode, advanceWidth, path }))
  }

  const font = new opentype.Font({
    familyName: fontName,
    styleName: 'Regular',
    unitsPerEm: UNITS_PER_EM,
    ascender: UNITS_PER_EM - BASELINE_Y * SCALE,
    descender: -(BASELINE_Y * SCALE),
    glyphs: builtGlyphs,
  })

  return font.toArrayBuffer()
}

export const HANDWRITING_CANVAS_SIZE = CANVAS_SIZE
export const HANDWRITING_BASELINE_Y = BASELINE_Y
