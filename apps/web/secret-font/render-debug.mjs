import opentype from 'opentype.js'
import fs from 'fs'
import { execSync } from 'child_process'
const SCRATCH = '/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad'
const font = opentype.parse(fs.readFileSync('public/fonts/QuteNoteSecret.otf').buffer.slice(0))
// re-encode via tsx-free inline port is risky; just hardcode via metrics
const MET = Object.fromEntries(fs.readFileSync('src/lib/secretMetrics.ts','utf8').matchAll(/^  (\w): (\d+),$/gm).toArray?.() ?? [...fs.readFileSync('src/lib/secretMetrics.ts','utf8').matchAll(/^  (\w): (\d+),$/gm)].map(m=>[m[1],+m[2]]))
const mk = (v, lvl, host) => String.fromCodePoint(0xe100 + ('aeiou'.indexOf(v)*2+lvl)*16 + (MET[host] ?? 6))
const sent = 's' + mk('o',0,'s') + 'm' + mk('e',0,'m') + 'th' + mk('i',0,'h') + 'ng ' + String.fromCodePoint(0xe1a0) + ' d' + mk('o',0,'d') + 'nt s' + mk('a',0,'s') + 'y n' + mk('e',0,'n') + mk('o',0,'n') + mk('u',1,'n') + 'gh s' + mk('i',0,'s')
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="560" viewBox="0 0 1300 560"><rect width="1300" height="560" fill="white"/>`
svg += font.getPath(sent, 30, 180, 54).toSVG(2)
svg += font.getPath('the quick brown fox', 30, 390, 54).toSVG(2)
svg += font.getPath('t t t', 30, 520, 48).toSVG(2)
svg += '</svg>'
fs.writeFileSync(SCRATCH + '/cipher2.svg', svg)
execSync(`qlmanage -t -s 1300 -o ${SCRATCH} ${SCRATCH}/cipher2.svg`)
console.log('ok')
