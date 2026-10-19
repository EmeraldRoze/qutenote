// The QuteNote Secret Language (Emerald's cipher, Oct 18).
//
// Rules:
// - Consonants stand on the line.
// - A vowel attaches to the PREVIOUS letter: a/e/i/u go UNDER it, o goes OVER.
// - A word-INITIAL vowel attaches to the NEXT letter instead ("amy": a under m).
// - Repeat vowels on the same host stack outward in reading order (2 deep;
//   anything deeper stands inline).
// - The words "I" and "a" have their own standalone glyphs.
// - Numbers and punctuation stay as themselves.
//
// encodeSecret() turns plain text into the codepoint string the
// QuteNoteSecret font renders; the plain text itself is what's stored, so
// "decoding" inside QuteNote is simply showing the original message.

import { SECRET_MARK_CLS, SECRET_DEFAULT_CLS } from './secretMetrics'

// mark codepoint = PUA_MARK + (vowelIdx(aeiou)*2 + level(0|1)) * 16 + widthClass
// (letters are proportional, so each mark exists once per host width class)
const PUA_MARK = 0xe100
const PUA_STANDALONE_I = 0xe1a0
const PUA_STANDALONE_A = 0xe1a1

const VOWELS = 'aeiou'
const isLetter = (c: string) => /[a-z]/i.test(c)
const isVowel = (c: string) => VOWELS.includes(c.toLowerCase())

function mark(vowel: string, level: number, host: string): string {
  const vi = VOWELS.indexOf(vowel.toLowerCase())
  const cls = SECRET_MARK_CLS[host] ?? SECRET_DEFAULT_CLS
  return String.fromCodePoint(PUA_MARK + (vi * 2 + Math.min(level, 1)) * 16 + cls)
}

function encodeWord(word: string): string {
  const lower = word.toLowerCase()
  if (lower === 'i') return String.fromCodePoint(PUA_STANDALONE_I)
  if (lower === 'a') return String.fromCodePoint(PUA_STANDALONE_A)

  // Group letters: each consonant hosts the vowels that attach to it.
  type Host = { consonant: string | null; vowels: string[] }
  const hosts: Host[] = []
  let leadingVowels: string[] = []
  for (const ch of lower) {
    if (!isVowel(ch)) {
      hosts.push({ consonant: ch, vowels: leadingVowels })
      leadingVowels = []
    } else if (hosts.length) {
      hosts[hosts.length - 1].vowels.push(ch)
    } else {
      leadingVowels.push(ch) // word starts with vowels → attach to next consonant
    }
  }

  let out = ''
  for (const h of hosts) {
    out += h.consonant
    let under = 0
    let over = 0
    for (const v of h.vowels) {
      const level = v === 'o' ? over++ : under++
      if (level >= 2) { out += v; continue } // too deep — stand inline
      out += mark(v, level, h.consonant as string)
    }
  }
  // An all-vowel word ("eau") has no consonant hosts — render inline.
  if (!hosts.length) out = lower
  else if (leadingVowels.length) out += leadingVowels.join('') // trailing-edge case safety

  return out
}

export function encodeSecret(text: string): string {
  // Words run together with no gap (her call: the plain text is always one
  // Decode tap away). A zero-width space replaces each real space so long
  // messages still wrap; everything else (numbers, punctuation) stays inline.
  let out = ''
  let word = ''
  for (const ch of text) {
    if (isLetter(ch)) { word += ch; continue }
    if (word) { out += encodeWord(word); word = '' }
    out += ch === ' ' ? '\u200b' : ch
  }
  if (word) out += encodeWord(word)
  return out
}

export const SECRET_FONT_FAMILY = 'QuteNoteSecret'
