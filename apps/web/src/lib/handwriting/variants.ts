import { ALL_CHARS } from './alphabet'
import type { Stroke, GlyphStrokes } from './compileFont'

// Letter variations (Emerald, Oct 18): real handwriting never draws the same
// letter twice the same way. Every letter keeps up to two ALTERNATE takes
// alongside its primary — real samples collected from the word sessions, or
// synthesized wobble when only one sample exists. The font carries the
// alternates at Private Use Area codepoints, and rendered notes cycle
// through them so "banana" gets three different a's.

export const MAX_ALTS = 2
const PUA_BASE = 0xe000

// Storage convention: primary ink lives at the character key ("a"); the
// alternates live beside it at "a#1" and "a#2" in the same glyph map.
export function altKey(char: string, n: number): string {
  return `${char}#${n}`
}

export function parseAltKey(key: string): { char: string; n: number } | null {
  const i = key.indexOf('#')
  if (i <= 0) return null
  const n = Number(key.slice(i + 1))
  const char = key.slice(0, i)
  if (!Number.isInteger(n) || n < 1 || n > MAX_ALTS) return null
  return { char, n }
}

// Deterministic PUA codepoint for a character's nth alternate.
export function altCodepoint(char: string, n: number): number | null {
  const idx = ALL_CHARS.indexOf(char)
  if (idx < 0) return null
  return PUA_BASE + idx * MAX_ALTS + (n - 1)
}

// Variant availability for RENDERING: the compiler fills every empty slot
// with synthesized wobble, so any captured letter has the full family.
export function renderAltCounts(glyphs: GlyphStrokes): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const key of Object.keys(glyphs)) {
    if (parseAltKey(key)) continue
    if (glyphs[key]?.length) counts[key] = MAX_ALTS
  }
  return counts
}

// Rewrite text for display in the handwriting font: each repeat of a letter
// cycles primary → alt1 → alt2 → primary… Editing surfaces keep plain text;
// this is for previews and printed cards only.
export function varyHandwrittenText(text: string, counts: Record<string, number>): string {
  const seen: Record<string, number> = {}
  let out = ''
  for (const ch of text) {
    const available = counts[ch] ?? 0
    if (!available) { out += ch; continue }
    const occurrence = seen[ch] ?? 0
    seen[ch] = occurrence + 1
    const pick = occurrence % (available + 1)
    if (pick === 0) { out += ch; continue }
    const cp = altCodepoint(ch, pick)
    out += cp ? String.fromCodePoint(cp) : ch
  }
  return out
}

// Synthesized variation: the same ink with a human amount of wobble —
// a touch of rotation, a whisper of scale, deterministic per seed.
export function jitterStrokes(strokes: Stroke[], seed: number): Stroke[] {
  const rand = (k: number) => {
    const x = Math.sin(seed * 374761393 + k * 668265263) * 43758.5453
    return x - Math.floor(x) // 0..1
  }
  const angle = (rand(1) - 0.5) * (Math.PI / 180) * 4.5 // ±2.25°
  const scale = 0.965 + rand(2) * 0.07 // 0.965..1.035
  const dy = (rand(3) - 0.5) * 5
  let cx = 0, cy = 0, n = 0
  for (const s of strokes) for (const p of s) { cx += p.x; cy += p.y; n++ }
  if (!n) return strokes
  cx /= n; cy /= n
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return strokes.map((s) => s.map((p) => {
    const x = (p.x - cx) * scale
    const y = (p.y - cy) * scale
    return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos + dy }
  }))
}
