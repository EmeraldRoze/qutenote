// Builds the QuteNote Secret Language font from Emerald's traced symbols.
//   node secret-font/build-secret-font.mjs   (from apps/web)
//
// The writing system (Emerald, Oct 18):
// - consonants sit on the line, monospaced
// - vowels attach to the previous letter (word-initial: the NEXT letter):
//   a/e/i/u go UNDER it, o goes OVER it; repeats stack outward (2 levels)
// - standalone "I" and "a" words get their own tall diamond glyphs
// The attachment logic lives in src/lib/secret.ts (encodeSecret); this font
// provides the glyphs: letters at their codepoints, vowel MARKS (zero-advance,
// centered on the previous glyph) and standalone forms at PUA codepoints.
import fs from 'fs'
import opentype from 'opentype.js'

const contours = JSON.parse(fs.readFileSync(new URL('./contours.json', import.meta.url)))

const UPM = 1000
const ADV = 620           // monospace advance
const SCALE = 6           // traced px → font units (tallest symbol ≈116px → ≈700)
const BASE = 0            // baseline

// PUA plan (mirror of src/lib/secret.ts):
const PUA_MARK = 0xe100   // + vowelIdx(aeiou)*2 + level(0|1)
const PUA_STANDALONE_I = 0xe120
const PUA_STANDALONE_A = 0xe121

function contoursToPath(glyphData, { scale = SCALE, cx = ADV / 2, bottom = BASE, flipTo = null } = {}) {
  // glyph pixel space: y down. Font: y up. Place bottom of ink at `bottom`,
  // centered horizontally on cx.
  const allPts = glyphData.contours.flat()
  const minX = Math.min(...allPts.map((p) => p[0]))
  const maxX = Math.max(...allPts.map((p) => p[0]))
  const minY = Math.min(...allPts.map((p) => p[1]))
  const maxY = Math.max(...allPts.map((p) => p[1]))
  const w = (maxX - minX) * scale
  const path = new opentype.Path()
  for (const c of glyphData.contours) {
    c.forEach(([px, py], i) => {
      const x = cx - w / 2 + (px - minX) * scale
      const y = bottom + (maxY - py) * scale
      if (i === 0) path.moveTo(x, y)
      else path.lineTo(x, y)
    })
    path.close()
  }
  return { path, inkW: w, inkH: (maxY - minY) * scale }
}

const glyphs = [
  new opentype.Glyph({ name: '.notdef', advanceWidth: ADV, path: new opentype.Path() }),
  new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: ADV * 0.7, path: new opentype.Path() }),
]

// ── Letters: same symbol for lower + upper case ──
for (const [L, data] of Object.entries(contours)) {
  const lower = L.toLowerCase().codePointAt(0)
  const upper = L.codePointAt(0)
  const { path } = contoursToPath(data, { bottom: BASE })
  const g = new opentype.Glyph({ name: `sym_${L}`, unicode: lower, advanceWidth: ADV, path })
  g.addUnicode(upper)
  glyphs.push(g)
}

// ── Vowel marks: small versions, zero advance, centered on the PREVIOUS
//    glyph (so they're emitted after their host) ──
const VOWELS = ['A', 'E', 'I', 'O', 'U']
const MARK_SCALE = SCALE * 0.78
for (let vi = 0; vi < VOWELS.length; vi++) {
  const V = VOWELS[vi]
  const data = contours[V]
  for (let level = 0; level < 2; level++) {
    const probe = contoursToPath(data, { scale: MARK_SCALE })
    const under = V !== 'O'
    const gapBase = 70
    const bottom = under
      ? -(gapBase + probe.inkH) - level * (probe.inkH + 55)
      : 780 + gapBase + level * (probe.inkH + 55)
    const { path } = contoursToPath(data, { scale: MARK_SCALE, cx: -ADV / 2, bottom })
    glyphs.push(new opentype.Glyph({
      name: `mark_${V}_${level}`,
      unicode: PUA_MARK + vi * 2 + level,
      advanceWidth: 0,
      path,
    }))
  }
}

// ── Standalone "I" and "a" words: tall diamond stacks (from her sketches) ──
function diamond(path, cx, cy, rw, rh) {
  path.moveTo(cx, cy + rh)
  path.lineTo(cx + rw, cy)
  path.lineTo(cx, cy - rh)
  path.lineTo(cx - rw, cy)
  path.close()
}
function diamondOutline(path, cx, cy, rw, rh, t = 26) {
  diamond(path, cx, cy, rw, rh)
  // inner hole, reverse winding
  path.moveTo(cx, cy - (rh - t))
  path.lineTo(cx + (rw - t * rw / rh), cy)
  path.lineTo(cx, cy + (rh - t))
  path.lineTo(cx - (rw - t * rw / rh), cy)
  path.close()
}
function dot(path, cx, cy, r) {
  const k = 0.5523 * r
  path.moveTo(cx + r, cy)
  path.curveTo(cx + r, cy + k, cx + k, cy + r, cx, cy + r)
  path.curveTo(cx - k, cy + r, cx - r, cy + k, cx - r, cy)
  path.curveTo(cx - r, cy - k, cx - k, cy - r, cx, cy - r)
  path.curveTo(cx + k, cy - r, cx + r, cy - k, cx + r, cy)
  path.close()
}

{ // standalone I: dot · small diamond · large diamond · small diamond · dot
  const p = new opentype.Path()
  const cx = ADV / 2
  dot(p, cx, 760, 22)
  diamondOutline(p, cx, 640, 60, 85)
  diamondOutline(p, cx, 390, 105, 150)
  diamondOutline(p, cx, 140, 60, 85)
  dot(p, cx, 20, 22)
  glyphs.push(new opentype.Glyph({ name: 'standalone_I', unicode: PUA_STANDALONE_I, advanceWidth: ADV, path: p }))
}
{ // standalone a: small diamond · large diamond with center dot · small diamond, dots at tips
  const p = new opentype.Path()
  const cx = ADV / 2
  dot(p, cx, 740, 20)
  diamondOutline(p, cx, 630, 55, 80)
  diamondOutline(p, cx, 380, 130, 160)
  dot(p, cx, 380, 34)
  diamondOutline(p, cx, 130, 55, 80)
  dot(p, cx, 20, 20)
  glyphs.push(new opentype.Glyph({ name: 'standalone_a', unicode: PUA_STANDALONE_A, advanceWidth: ADV, path: p }))
}

const font = new opentype.Font({
  familyName: 'QuteNoteSecret',
  styleName: 'Regular',
  unitsPerEm: UPM,
  ascender: 980,
  descender: -380,
  glyphs,
})

const out = new URL('../public/fonts/QuteNoteSecret.otf', import.meta.url)
fs.writeFileSync(out, Buffer.from(font.toArrayBuffer()))
console.log('wrote', out.pathname, '| glyphs:', glyphs.length)
