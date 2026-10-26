import { useNavigate } from 'react-router-dom'
import { encodeSecret, SECRET_FONT_FAMILY } from '../lib/secret'
import FlowerText from '../components/FlowerText'
import flowerGlyphs from '../lib/flowerGlyphs.json'

// The decoder key for Emerald's Secret Language: the full alphabet, the
// vowel rules, and the standalone words — pretty enough to screenshot and
// share with someone who just got a mysterious postcard.

const ROW1 = 'abcdefghijklm'.split('')
const ROW2 = 'nopqrstuvwxyz'.split('')

export default function SecretKeyPage() {
  const navigate = useNavigate()

  const cell = (ch: string) => (
    <div key={ch} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
      background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '12px', padding: '8px 2px 4px',
    }}>
      <span style={{ fontFamily: SECRET_FONT_FAMILY, fontSize: '30px', lineHeight: '44px', color: 'var(--ink)' }}>{ch}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--ink-mid)', textTransform: 'uppercase' }}>{ch}</span>
    </div>
  )

  // Emerald, Oct 25: the Flower Language gets a key here too, beside the
  // Secret one. Each letter is one of her flowers; a word gathers into a
  // tied bouquet.
  const flowerCell = (ch: string) => {
    const g = (flowerGlyphs as { letters: Record<string, { w: number; h: number }> }).letters[ch]
    if (!g) return null
    return (
      <div key={`f-${ch}`} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
        background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '12px', padding: '8px 2px 4px',
      }}>
        <img src={`/flower/${ch}.png`} alt="" style={{ height: '44px', width: 'auto', objectFit: 'contain', filter: 'grayscale(1)' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--ink-mid)', textTransform: 'uppercase' }}>{ch}</span>
      </div>
    )
  }

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
          width: '44px', height: '44px', borderRadius: '50%', background: '#E3D5CC',
          border: 'none', cursor: 'pointer', color: '#4A2424', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 300, color: 'var(--ink)' }}>The Secret Language</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', lineHeight: 1.5, margin: '0 0 18px' }}>
          Cards written with the Secret 🤫 pen use this alphabet. Decode by hand with the key below — or just reply in it and start a very qute conspiracy.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {ROW1.map(cell)}
          {ROW2.map(cell)}
        </div>

        <div style={{ marginTop: '22px', background: '#F4ECE6', border: '2px dashed #B4897A', borderRadius: '16px', padding: '14px 16px' }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>The vowel rules</p>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.55 }}>
            <li>a, e, i and u tuck <strong>under</strong> the letter before them</li>
            <li>o floats <strong>over</strong> the letter before it</li>
            <li>a word that starts with a vowel tucks it under the <strong>next</strong> letter</li>
            <li>double vowels stack outward in order</li>
            <li>the words “I” and “a” get their own tall marks</li>
          </ul>
        </div>

        <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '10px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '16px', padding: '14px' }}>
          {['love', 'amy', 'zoo', 'I', 'a'].map(example)}
        </div>

        {/* The Flower Language, same page */}
        <h2 style={{ margin: '34px 0 0', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '20px', color: 'var(--ink)' }}>
          The Flower Language
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', lineHeight: 1.5, margin: '8px 0 18px' }}>
          Cards written with the Flowers 🌷 pen say it in blooms. Every letter is a flower, and a word gathers into one tied bouquet you read left to right.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {ROW1.map(flowerCell)}
          {ROW2.map(flowerCell)}
        </div>

        <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '18px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '16px', padding: '18px 14px' }}>
          {['love', 'hug'].map((w) => (
            <div key={`fx-${w}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <FlowerText text={w} size={58} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>{w}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
