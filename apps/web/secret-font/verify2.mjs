import opentype from 'opentype.js'
import fs from 'fs'
const SCRATCH = '/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad'
const VOWELS = 'aeiou'
const isLetter = (c) => /[a-z]/i.test(c)
const isVowel = (c) => VOWELS.includes(c.toLowerCase())
const mark = (v, level, host) => String.fromCodePoint(0xe200 + (host.charCodeAt(0) - 97) * 10 + VOWELS.indexOf(v.toLowerCase()) * 2 + Math.min(level, 1))
function encodeWord(word) {
  const lower = word.toLowerCase()
  if (lower === 'i') return String.fromCodePoint(0xe1a0)
  if (lower === 'a') return String.fromCodePoint(0xe1a1)
  const hosts = []
  let leading = []
  for (const ch of lower) {
    if (!isVowel(ch)) { hosts.push({ c: ch, v: leading }); leading = [] }
    else if (hosts.length) hosts[hosts.length - 1].v.push(ch)
    else leading.push(ch)
  }
  let out = ''
  for (const h of hosts) {
    out += h.c
    let under = 0, over = 0
    for (const v of h.v) {
      const level = v === 'o' ? over++ : under++
      if (level >= 2) { out += v; continue }
      out += mark(v, level, h.c)
    }
  }
  if (!hosts.length) out = lower
  else if (leading.length) out += leading.join('')
  return out
}
function encodeSecret(text) {
  let out = '', word = ''
  for (const ch of text) {
    if (isLetter(ch)) { word += ch; continue }
    if (word) { out += encodeWord(word); word = '' }
    out += ch === ' ' ? '​' : ch
  }
  if (word) out += encodeWord(word)
  return out
}
const buf = fs.readFileSync(new URL('../public/fonts/QuteNoteSecret.otf', import.meta.url))
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
const text = 'I went to the store to get a bottle of milk and drank the whole thing right when I got to my car because it was so delicious'
const words = text.split(' ')
const lines = [words.slice(0, 8).join(' '), words.slice(8, 16).join(' '), words.slice(16, 22).join(' '), words.slice(22).join(' ')]
const out = []
for (let li = 0; li < lines.length; li++) {
  const path = font.getPath(encodeSecret(lines[li]), 20, 150 + li * 190, 44)
  let poly = [], polys = []
  for (const c of path.commands) {
    if (c.type === 'M') { if (poly.length > 1) polys.push(poly); poly = [[c.x, c.y]] }
    else if (c.type === 'L') poly.push([c.x, c.y])
    else if (c.type === 'C') { const [x0, y0] = poly[poly.length - 1]; for (let t = 0.2; t <= 1.001; t += 0.2) { const u = 1 - t; poly.push([u*u*u*x0 + 3*u*u*t*c.x1 + 3*u*t*t*c.x2 + t*t*t*c.x, u*u*u*y0 + 3*u*u*t*c.y1 + 3*u*t*t*c.y2 + t*t*t*c.y]) } }
    else if (c.type === 'Q') { const [x0, y0] = poly[poly.length - 1]; for (let t = 0.25; t <= 1.001; t += 0.25) { const u = 1 - t; poly.push([u*u*x0 + 2*u*t*c.x1 + t*t*c.x, u*u*y0 + 2*u*t*c.y1 + t*t*c.y]) } }
    else if (c.type === 'Z') { if (poly.length > 1) { poly.push(poly[0]); polys.push(poly) } poly = [] }
  }
  if (poly.length > 1) polys.push(poly)
  out.push(polys)
}
fs.writeFileSync(SCRATCH + '/verify_polys.json', JSON.stringify(out))
console.log('lines', out.map(p => p.length).join('/'))
