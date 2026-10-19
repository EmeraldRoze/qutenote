import opentype from 'opentype.js'
import fs from 'fs'
const SCRATCH = '/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad'
const VOWELS = 'aeiou'
const mark = (v, level, host) => String.fromCodePoint(0xe200 + (host.charCodeAt(0) - 97) * 10 + VOWELS.indexOf(v) * 2 + Math.min(level, 1))
const buf = fs.readFileSync(new URL('../public/fonts/QuteNoteSecret.otf', import.meta.url))
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
// o over t (tall), o over c (short), o over g, o over m; e under those; double o stack on z
const s = 't' + mark('o',0,'t') + '  c' + mark('o',0,'c') + '  g' + mark('o',0,'g') + '  m' + mark('o',0,'m') + '  z' + mark('o',0,'z') + mark('o',1,'z') + '  n' + mark('e',0,'n') + mark('o',0,'n') + mark('u',1,'n')
const path = font.getPath(s, 30, 260, 110)
const out = []
let poly = [], polys = []
for (const c of path.commands) {
  if (c.type === 'M') { if (poly.length > 1) polys.push(poly); poly = [[c.x, c.y]] }
  else if (c.type === 'L') poly.push([c.x, c.y])
  else if (c.type === 'C') { const [x0, y0] = poly[poly.length - 1]; for (let t = 0.2; t <= 1.001; t += 0.2) { const u = 1 - t; poly.push([u*u*u*x0 + 3*u*u*t*c.x1 + 3*u*t*t*c.x2 + t*t*t*c.x, u*u*u*y0 + 3*u*u*t*c.y1 + 3*u*t*t*c.y2 + t*t*t*c.y]) } }
  else if (c.type === 'Q') { const [x0, y0] = poly[poly.length - 1]; for (let t = 0.25; t <= 1.001; t += 0.25) { const u = 1 - t; poly.push([u*u*x0 + 2*u*t*c.x1 + t*t*c.x, u*u*y0 + 2*u*t*c.y1 + t*t*c.y]) } }
  else if (c.type === 'Z') { if (poly.length > 1) { poly.push(poly[0]); polys.push(poly) } poly = [] }
}
if (poly.length > 1) polys.push(poly)
fs.writeFileSync(SCRATCH + '/capcheck.json', JSON.stringify([polys]))
console.log('ok', polys.length)
