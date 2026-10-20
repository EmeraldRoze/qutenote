// Server-side Flower Language layout for the printed card (mirror of
// apps/web/src/lib/flower.ts — keep the layout numbers in sync). Draws
// Emerald's flower sprites (assets/flower/) into a pdfkit document: each word
// a tied-bouquet fan, punctuation as botanical marks, numbers as plain text.
import fs from 'fs'
import path from 'path'

const ASSETS = path.join(process.cwd(), 'assets', 'flower')

interface GlyphMeta { w: number; h: number }
let META: { letters: Record<string, GlyphMeta>; marks: Record<string, GlyphMeta & { name: string }>; numbers?: Record<string, GlyphMeta> } | null = null
function meta() {
  if (!META) META = JSON.parse(fs.readFileSync(path.join(ASSETS, 'glyphs.json'), 'utf8'))
  return META!
}
export function hasFlowerAssets(): boolean {
  try { meta(); return true } catch { return false }
}

const MARK_HEIGHT: Record<string, number> = {
  period: 0.16, comma: 0.3, colon: 0.34, semicolon: 0.36, exclam: 0.85,
  question: 0.8, 'paren-open': 0.82, 'paren-close': 0.82, 'quote-open': 0.3,
  'quote-close': 0.3, hyphen: 0.2, emdash: 0.22, 'bracket-open': 0.9,
  'bracket-close': 0.9, 'brace-open': 0.9, 'brace-close': 0.9, slash: 0.55,
}
const MARK_FOR: Record<string, string> = {
  '.': '.', ',': ',', ':': ':', ';': ';', '!': '!', '?': '?', '(': '(', ')': ')',
  '"': 'qo', '“': 'qo', '”': 'qc', '-': '-', '–': 'em', '—': 'em',
  '[': '[', ']': ']', '{': '{', '}': '}', '/': '/', '\\': '/',
}

// Draws the message as bouquets inside the given box; `size` = bouquet height
// in PDF points. Wraps bouquets within boxW.
export function drawFlowerText(doc: any, text: string, boxX: number, boxY: number, boxW: number, size: number) {
  const m = meta()
  let x = boxX
  let y = boxY
  const gapX = size * 0.12
  const lineH = size * 1.3
  let openQuote = true

  const pieces: Array<{ w: number; isWord?: boolean; isMark?: boolean; isNumber?: boolean; baseMark?: boolean; draw: (px: number, py: number) => void }> = []
  let word = ''
  const flushWord = () => {
    if (!word) return
    const chars = word.toLowerCase().split('').filter((c) => m.letters[c])
    word = ''
    const n = chars.length
    if (!n) return
    const maxA = n <= 1 ? 0 : n === 2 ? 10 : n === 3 ? 15 : Math.min(46, 10 + n * 7)
    const W = Math.min(2.2, Math.max(0.6, 0.55 + 0.34 * (n - 1) * Math.sin((maxA * Math.PI) / 180 + 0.2))) * size
    pieces.push({
      w: W,
      isWord: true,
      draw: (px, py) => {
        const tieX = px + W / 2
        const tieY = py + size * 1.09
        chars.forEach((ch, i) => {
          const g = m.letters[ch]
          const angle = n <= 1 ? 0 : -maxA + (2 * maxA * i) / (n - 1)
          const scale = 0.86 + 0.14 * (((i + n) * 2654435761) % 97) / 97
          const gh = scale * size
          const gw = (g.w / g.h) * gh
          doc.save()
          doc.translate(tieX, tieY).rotate(angle)
          doc.image(path.join(ASSETS, `${ch}.png`), -gw / 2, -gh, { width: gw, height: gh })
          doc.restore()
        })
      },
    })
  }

  for (const ch of text) {
    if (/[a-zA-Z'’]/.test(ch)) { if (ch !== "'" && ch !== '’') word += ch; continue }
    flushWord()
    if (ch === ' ' || ch === '\n') continue
    const num = m.numbers?.[ch]
    if (num) {
      const nh = 0.85 * size
      const nw = (num.w / num.h) * nh
      pieces.push({
        w: nw,
        isMark: true,
        isNumber: true,
        draw: (px, py) => {
          doc.image(path.join(ASSETS, `num-${ch}.png`), px, py + size * 1.08 - nh, { width: nw, height: nh })
        },
      })
      continue
    }
    let key = MARK_FOR[ch]
    if (ch === '"') { key = openQuote ? 'qo' : 'qc'; openQuote = !openQuote }
    const mk = key ? m.marks[key] : undefined
    if (mk) {
      const mh = (MARK_HEIGHT[mk.name] ?? 0.4) * size
      const mw = (mk.w / mk.h) * mh
      const raised = mk.name.startsWith('quote')
      const isBase = mk.name === 'period' || mk.name === 'comma'
      pieces.push({
        w: mw,
        isMark: true,
        baseMark: isBase,
        draw: (px, py) => {
          // comma hangs below the line like a written comma
          const bottom = py + size * (raised ? 0.5 : mk.name === 'comma' ? 1.22 : 1.08)
          doc.image(path.join(ASSETS, `${mk.name}.png`), px, bottom - mh, { width: mw, height: mh })
        },
      })
    } else {
      const t = ch
      pieces.push({
        w: doc.widthOfString(t),
        draw: (px, py) => {
          doc.font('Times-Roman').fontSize(size * 0.3).fillColor('#2E2440')
          doc.text(t, px, py + size * 0.78, { lineBreak: false })
        },
      })
    }
  }
  flushWord()

  let prevWord: { w: number } | null = null
  for (const p of pieces) {
    // punctuation nestles against the bouquet it follows; base marks (acorn
    // period, comma) slide all the way to the right of the stem base
    if (prevWord && p.isMark && !p.isNumber) {
      x -= (p.baseMark ? Math.max(size * 0.26, prevWord.w / 2 - size * 0.18) : size * 0.26) + gapX
    }
    if (x + p.w > boxX + boxW && x > boxX) { x = boxX; y += lineH }
    p.draw(x, y)
    x += p.w + gapX
    prevWord = p.isWord ? p : null
  }
  return y + lineH
}
