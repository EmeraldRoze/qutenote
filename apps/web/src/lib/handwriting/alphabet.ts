// What we ask people to write. Since Oct 17 they write little WORDS, not
// single letters — letters written in flow look like real handwriting, while
// one-at-a-time letters come out stiff (Emerald's call). Each word session
// covers the whole alphabet with a dozen short, cute words; numbers come as
// little runs, and punctuation stays one mark at a time.

export interface HandwritingSession {
  key: string
  label: string
  chars: string[]
}

// Kept for the fix-one-letter touch-up mode and for progress counting.
export const SESSIONS: HandwritingSession[] = [
  { key: 'lowercase', label: 'Lowercase letters', chars: 'abcdefghijklmnopqrstuvwxyz'.split('') },
  { key: 'uppercase', label: 'Capital letters', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { key: 'numbers', label: 'Numbers', chars: '0123456789'.split('') },
  { key: 'punctuation', label: 'Punctuation', chars: ['.', ',', '!', '?', '-'] },
]

export interface WordSession {
  key: string
  label: string
  detail: string
  words: string[]
}

// Every lowercase letter appears in at least one word (a-z verified).
// Ordered as silly two-word pairs, Emerald's call (Oct 18):
// "hug qt · zap fox · kid nap · cry jam · slow vibe"
const LOWER_WORDS = ['hug', 'qt', 'zap', 'fox', 'kid', 'nap', 'cry', 'jam', 'slow', 'vibe']

export const WORD_SESSIONS: WordSession[] = [
  { key: 'lowercase', label: 'Little words', detail: 'Write each word in your everyday handwriting', words: LOWER_WORDS },
  { key: 'uppercase', label: 'BIG WORDS', detail: 'Same words, all capitals', words: LOWER_WORDS.map((w) => w.toUpperCase()) },
  { key: 'numbers', label: 'Numbers', detail: 'Little number runs', words: ['2026', '4813', '5790'] },
  { key: 'punctuation', label: 'Punctuation', detail: 'One little mark at a time', words: ['.', ',', '!', '?', '-'] },
]

export const ALL_CHARS = SESSIONS.flatMap((s) => s.chars)
export const TOTAL_CHARS = ALL_CHARS.length

// Spoken name for each prompt, shown under the big letter. The display font
// draws some glyphs almost identically (its j reads as an i, capital I as
// lowercase l), so the prompt always names the character in words too.
const PUNCTUATION_NAMES: Record<string, string> = {
  '.': 'a period', ',': 'a comma', '!': 'an exclamation point', '?': 'a question mark', '-': 'a hyphen',
}
export function charName(sessionKey: string, char: string): string {
  if (sessionKey === 'lowercase') return `lowercase ${char}`
  if (sessionKey === 'uppercase') return `capital ${char}`
  if (sessionKey === 'numbers') return `the number ${char}`
  return PUNCTUATION_NAMES[char] ?? char
}
