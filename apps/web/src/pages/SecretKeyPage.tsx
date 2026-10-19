import { useNavigate } from 'react-router-dom'
import { encodeSecret, SECRET_FONT_FAMILY } from '../lib/secret'

// The decoder key for Emerald's Secret Language: the full alphabet, the
// vowel rules, and the standalone words — pretty enough to screenshot and
// share with someone who just got a mysterious postcard.

const uv = '#5A32D6'

const ROW1 = 'abcdefghijklm'.split('')
const ROW2 = 'nopqrstuvwxyz'.split('')

export default function SecretKeyPage() {
  const navigate = useNavigate()

  const cell = (ch: string) => (
    <div key={ch} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
      background: '#fff', border: '1.5px solid var(--stone)', borderRadius: '12px', padding: '8px 2px 4px',
    }}>
      <span style={{ fontFamily: SECRET_FONT_FAMILY, fontSize: '30px', lineHeight: '44px', color: 'var(--ink)' }}>{ch}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--ink-mid)', textTransform: 'uppercase' }}>{ch}</span>
    </div>
  )

  const example = (word: string) => (
    <div key={word} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <span style={{ fontFamily: SECRET_FONT_FAMILY, fontSize: '34px', lineHeight: '64px', color: 'var(--ink)' }}>{encodeSecret(word)}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>{word}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <nav style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{
          width: '36px', height: '36px', borderRadius: '50%', background: 'var(--lavender-pale)',
          border: 'none', cursor: 'pointer', color: uv, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)' }}>The Secret Language</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', lineHeight: 1.5, margin: '0 0 18px' }}>
          Cards written with the Secret 🤫 pen use this alphabet. Decode by hand with the key below — or just reply in it and start a very qute conspiracy.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {ROW1.map(cell)}
          {ROW2.map(cell)}
        </div>

        <div style={{ marginTop: '22px', background: 'var(--lavender-pale)', border: '2px dashed var(--lilac)', borderRadius: '16px', padding: '14px 16px' }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>The vowel rules</p>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.55 }}>
            <li>a, e, i and u tuck <strong>under</strong> the letter before them</li>
            <li>o floats <strong>over</strong> the letter before it</li>
            <li>a word that starts with a vowel tucks it under the <strong>next</strong> letter</li>
            <li>double vowels stack outward in order</li>
            <li>the words “I” and “a” get their own tall marks</li>
          </ul>
        </div>

        <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '10px', background: '#fff', border: '1.5px solid var(--stone)', borderRadius: '16px', padding: '14px' }}>
          {['love', 'amy', 'zoo', 'I', 'a'].map(example)}
        </div>
      </div>
    </div>
  )
}
