// Builds the QuteNote Secret Language font from Emerald's traced symbols.
//   node secret-font/build-secret-font.mjs   (from apps/web)
//
// The writing system (Emerald, Oct 18):
// - consonants sit on the line; letters are PROPORTIONAL (each symbol takes
//   only the width of its ink + a small bearing) so the writing sits close
//   together like real handwriting — her build-41 feedback
// - vowels attach to the previous letter (word-initial: the NEXT letter):
//   a/e/i/u go UNDER it, o goes OVER it; repeats stack outward (2 levels)
// - standalone "I" and "a" words get their own tall diamond glyphs
//
// Proportional widths break the old fixed mark centering, so each vowel mark
// now exists once per WIDTH CLASS (host advance quantized to CLS_STEP units)
// and encodeSecret picks the class of the letter it attaches to via the
// generated secretMetrics.ts (written by this script into web AND api).
import fs from 'fs'
import opentype from 'opentype.js'

const contours = JSON.parse(fs.readFileSync(new URL('./contours.json', import.meta.url)))

const UPM = 1000
const SCALE = 6           // traced px → font units (tallest symbol ≈116px → ≈700)
const BASE = 0            // baseline
const SB = 30             // side bearing each side of the ink (tightened per build-41 feedback)
const CLS_STEP = 64       // advance quantization for mark width classes
const SPACE_ADV = 220

// PUA plan (mirror of src/lib/secret.ts):
// mark codepoint = PUA_MARK + (vowelIdx*2 + level) * 16 + widthClass(0..15)
const PUA_MARK = 0xe100
const PUA_STANDALONE_I = 0xe1a0
const PUA_STANDALONE_A = 0xe1a1

function contoursToPath(glyphData, { scale = SCALE, cx, bottom = BASE } = {}) {
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

function inkWidth(glyphData, scale = SCALE) {
  const allPts = glyphData.contours.flat()
  return (Math.max(...allPts.map((p) => p[0])) - Math.min(...allPts.map((p) => p[0]))) * scale
}

const glyphs = [
  new opentype.Glyph({ name: '.notdef', advanceWidth: 400, path: new opentype.Path() }),
  new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: SPACE_ADV, path: new opentype.Path() }),
]

// ── Letters: same symbol for lower + upper case, proportional advance ──
const advByLetter = {}
for (const [L, data] of Object.entries(contours)) {
  const adv = Math.round(inkWidth(data) + 2 * SB)
  advByLetter[L.toLowerCase()] = adv
  const { path } = contoursToPath(data, { cx: adv / 2, bottom: BASE })
  const g = new opentype.Glyph({ name: `sym_${L}`, unicode: L.toLowerCase().codePointAt(0), advanceWidth: adv, path })
  g.addUnicode(L.codePointAt(0))
  glyphs.push(g)
}

// ── Vowel marks: small versions, zero advance, centered on the PREVIOUS
//    glyph — one copy per width class so they stay centered now that
//    letters are proportional ──
const VOWELS = ['A', 'E', 'I', 'O', 'U']
const MARK_SCALE = SCALE * 0.78
const clsOf = (adv) => Math.max(0, Math.min(15, Math.round(adv / CLS_STEP)))
const usedClasses = [...new Set(Object.values(advByLetter).map(clsOf))].sort((a, b) => a - b)
for (let vi = 0; vi < VOWELS.length; vi++) {
  const V = VOWELS[vi]
  const data = contours[V]
  for (let level = 0; level < 2; level++) {
    const probe = contoursToPath(data, { scale: MARK_SCALE, cx: 0 })
    const under = V !== 'O'
    const gapBase = 70
    const bottom = under
      ? -(gapBase + probe.inkH) - level * (probe.inkH + 55)
      : 780 + gapBase + level * (probe.inkH + 55)
    for (const cls of usedClasses) {
      const hostAdv = cls * CLS_STEP
      const { path } = contoursToPath(data, { scale: MARK_SCALE, cx: -hostAdv / 2, bottom })
      glyphs.push(new opentype.Glyph({
        name: `mark_${V}_${level}_c${cls}`,
        unicode: PUA_MARK + (vi * 2 + level) * 16 + cls,
        advanceWidth: 0,
        path,
      }))
    }
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
  const adv = 105 * 2 + 2 * SB
  const p = new opentype.Path()
  const cx = adv / 2
  dot(p, cx, 760, 22)
  diamondOutline(p, cx, 640, 60, 85)
  diamondOutline(p, cx, 390, 105, 150)
  diamondOutline(p, cx, 140, 60, 85)
  dot(p, cx, 20, 22)
  glyphs.push(new opentype.Glyph({ name: 'standalone_I', unicode: PUA_STANDALONE_I, advanceWidth: adv, path: p }))
}
{ // standalone a: small diamond · large diamond with center dot · small diamond, dots at tips
  const adv = 130 * 2 + 2 * SB
  const p = new opentype.Path()
  const cx = adv / 2
  dot(p, cx, 740, 20)
  diamondOutline(p, cx, 630, 55, 80)
  diamondOutline(p, cx, 380, 130, 160)
  dot(p, cx, 380, 34)
  diamondOutline(p, cx, 130, 55, 80)
  dot(p, cx, 20, 20)
  glyphs.push(new opentype.Glyph({ name: 'standalone_a', unicode: PUA_STANDALONE_A, advanceWidth: adv, path: p }))
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

// ── Generated metrics: the width class of every letter, consumed by
//    encodeSecret in BOTH apps. Do not edit by hand. ──
const clsEntries = Object.entries(advByLetter)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([ch, adv]) => `  ${ch}: ${clsOf(adv)},`)
  .join('\n')
const metrics = `// GENERATED by secret-font/build-secret-font.mjs — do not edit.
// Width class (advance / ${CLS_STEP}, rounded) of each secret-language letter.
// Vowel marks exist once per class so they center on any host width.
export const SECRET_MARK_CLS: Record<string, number> = {
${clsEntries}
}
export const SECRET_DEFAULT_CLS = ${clsOf(400)}
`
fs.writeFileSync(new URL('../src/lib/secretMetrics.ts', import.meta.url), metrics)
fs.writeFileSync(new URL('../../api/src/lib/secretMetrics.ts', import.meta.url), metrics)
console.log('wrote', out.pathname, '| glyphs:', glyphs.length, '| classes:', usedClasses.join(','))
