// The Flower Language (Emerald, Oct 19). Every letter is a flower; each word
// gathers its flowers into a tied-bouquet fan, read left to right. Punctuation
// gets its own botanical marks; numbers print as themselves until her numbers
// chart arrives. There is NO key screen — the only decode is the button on
// the card. Sprites live in public/flower/ (made by flower-font/make-sprites.py).
import GLYPHS from './flowerGlyphs.json'

export interface FlowerSprite { src: string; w: number; h: number }
export interface BouquetStem extends FlowerSprite {
  angle: number   // degrees, rotation about the stem's bottom-center
  scale: number   // multiply natural size
}
export interface BouquetWord { kind: 'word'; stems: BouquetStem[]; width: number; height: number; tieX: number }
export interface MarkPiece { kind: 'mark'; sprite: FlowerSprite; heightFactor: number; raise: boolean }
export interface PlainPiece { kind: 'plain'; text: string }
export type FlowerPiece = BouquetWord | MarkPiece | PlainPiece

const letters = (GLYPHS as any).letters as Record<string, { w: number; h: number }>
const marks = (GLYPHS as any).marks as Record<string, { name: string; w: number; h: number }>

// How tall each punctuation mark stands relative to the bouquet height.
const MARK_HEIGHT: Record<string, number> = {
  period: 0.16, comma: 0.3, colon: 0.34, semicolon: 0.36, exclam: 0.85,
  question: 0.8, 'paren-open': 0.82, 'paren-close': 0.82, 'quote-open': 0.3,
  'quote-close': 0.3, hyphen: 0.2, emdash: 0.22, 'bracket-open': 0.9,
  'bracket-close': 0.9, 'brace-open': 0.9, 'brace-close': 0.9, slash: 0.55,
}
const RAISED = new Set(['quote-open', 'quote-close'])
const MARK_FOR: Record<string, string> = {
  '.': '.', ',': ',', ':': ':', ';': ';', '!': '!', '?': '?', '(': '(', ')': ')',
  '"': 'qo', '“': 'qo', '”': 'qc', '-': '-', '–': 'em', '—': 'em',
  '[': '[', ']': ']', '{': '{', '}': '}', '/': '/', '\\': '/',
}
let openQuote = true

export function spriteFor(name: string): FlowerSprite | null {
  if (letters[name]) return { src: `/flower/${name}.png`, ...letters[name] }
  return null
}

function bouquet(word: string): BouquetWord {
  const chars = word.toLowerCase().split('').filter((c) => letters[c])
  const n = chars.length
  const maxA = n <= 1 ? 0 : Math.min(46, 10 + n * 7)
  const stems: BouquetStem[] = chars.map((ch, i) => {
    const g = letters[ch]
    const angle = n <= 1 ? 0 : -maxA + (2 * maxA * i) / (n - 1)
    const scale = 0.86 + 0.14 * (((i + word.length) * 2654435761) % 97) / 97
    return { src: `/flower/${ch}.png`, w: g.w, h: g.h, angle, scale }
  })
  // width scales with the fan; height is the unit bouquet box
  const width = Math.max(0.6, 0.55 + 0.34 * (n - 1) * Math.sin((maxA * Math.PI) / 180 + 0.2))
  return { kind: 'word', stems, width: Math.min(width, 2.2), height: 1.12, tieX: 0.5 }
}

// Break text into renderable pieces: word bouquets, flower punctuation, and
// plain passthrough (numbers, unknown symbols). Apostrophes vanish inside
// words so "don't" stays one bouquet — the Decode button has the real text.
export function flowerPieces(text: string): FlowerPiece[] {
  openQuote = true
  const out: FlowerPiece[] = []
  let word = ''
  const flush = () => { if (word) { out.push(bouquet(word)); word = '' } }
  for (const ch of text) {
    if (/[a-zA-Z’']/.test(ch)) { if (ch !== "'" && ch !== '’') word += ch; continue }
    flush()
    if (ch === ' ' || ch === '\n') continue // bouquets breathe on their own
    let key = MARK_FOR[ch]
    if (ch === '"') { key = openQuote ? 'qo' : 'qc'; openQuote = !openQuote }
    const mk = key ? marks[key] : undefined
    if (mk) {
      out.push({
        kind: 'mark',
        sprite: { src: `/flower/${mk.name}.png`, w: mk.w, h: mk.h },
        heightFactor: MARK_HEIGHT[mk.name] ?? 0.4,
        raise: RAISED.has(mk.name),
      })
    } else {
      out.push({ kind: 'plain', text: ch })
    }
  }
  flush()
  return out
}
