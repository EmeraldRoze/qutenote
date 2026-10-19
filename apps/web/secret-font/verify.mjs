import opentype from 'opentype.js'
import fs from 'fs'
import { execSync } from 'child_process'
const SCRATCH = '/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad'
// inline mirror of encodeSecret (strip TS, inline metrics)
const met = fs.readFileSync(new URL('../src/lib/secretMetrics.ts', import.meta.url), 'utf8')
const MARK_CLS = Object.fromEntries([...met.matchAll(/^  (\w): (\d+),$/gm)].map(m => [m[1], +m[2]]))
const DEFAULT_CLS = +met.match(/SECRET_DEFAULT_CLS = (\d+)/)[1]
const VOWELS = 'aeiou'
const isLetter = (c) => /[a-z]/i.test(c)
const isVowel = (c) => VOWELS.includes(c.toLowerCase())
const mark = (v, level, host) => String.fromCodePoint(0xe100 + (VOWELS.indexOf(v.toLowerCase()) * 2 + Math.min(level, 1)) * 16 + (MARK_CLS[host] ?? DEFAULT_CLS))
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
const lines = [words.slice(0, 9).join(' '), words.slice(9, 19).join(' '), words.slice(19).join(' ')]
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="620" viewBox="0 0 1500 620"><rect width="1500" height="620" fill="white"/>'
lines.forEach((ln, i) => { svg += font.getPath(encodeSecret(ln), 30, 160 + i * 190, 42).toSVG(2) })
svg += '</svg>'
fs.writeFileSync(SCRATCH + '/verify.svg', svg)
execSync(`qlmanage -t -s 1500 -o ${SCRATCH} ${SCRATCH}/verify.svg`)
console.log('ok')
