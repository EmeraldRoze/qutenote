// The character set we ask people to write, split into short sessions so
// it doesn't feel like homework. Lowercase first (most used), then capitals,
// numbers, and a handful of punctuation marks that actually show up in notes.

export interface HandwritingSession {
  key: string
  label: string
  chars: string[]
}

export const SESSIONS: HandwritingSession[] = [
  { key: 'lowercase', label: 'Lowercase letters', chars: 'abcdefghijklmnopqrstuvwxyz'.split('') },
  { key: 'uppercase', label: 'Capital letters', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { key: 'numbers', label: 'Numbers', chars: '0123456789'.split('') },
  { key: 'punctuation', label: 'Punctuation', chars: ['.', ',', '!', '?', '-'] },
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
