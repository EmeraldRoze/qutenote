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
  { key: 'punctuation', label: 'Punctuation', chars: ['.', ',', "'", '!', '?', '-'] },
]

export const ALL_CHARS = SESSIONS.flatMap((s) => s.chars)
export const TOTAL_CHARS = ALL_CHARS.length // 68
