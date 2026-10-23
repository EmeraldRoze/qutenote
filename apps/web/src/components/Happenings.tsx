import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import QEmoji from './QEmoji'

// The Happenings status row + composer, shared by Home and Profile.

const label: React.CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--ink-mid)' }
export const STATUS_EMOJI = ['thought-bubble', 'sun', 'heart', 'coffee', 'moon', 'cloud', 'rainbow', 'music', 'flower', 'smile', 'joy', 'star', 'plane']

export interface MyStatus { id: string; emoji: string | null; text: string; createdAt: string }

export function HappeningsRow() {
  const [myStatus, setMyStatus] = useState<MyStatus | null>(null)
  const [composing, setComposing] = useState(false)

  useEffect(() => {
    api.get('/statuses/mine').then((r) => setMyStatus(r.data.data)).catch(() => {})
  }, [])

  return (
    <>
      <button onClick={() => setComposing(true)} style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
        padding: '8px 12px 8px 8px', borderRadius: '30px', border: '1.5px solid var(--outline)',
        background: 'var(--card)', boxShadow: 'var(--shadow-card)', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '20px', background: 'var(--selected-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <QEmoji name={myStatus?.emoji ?? 'sun'} size={28} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={label}>Happenings</span>
          <span style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: myStatus ? 'var(--ink)' : 'var(--ink-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {myStatus?.text ?? "How's your heart?"}
          </span>
        </span>
        <span style={{ color: 'var(--ink)', display: 'flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z" /></svg>
        </span>
      </button>
      {composing && <StatusComposer onDone={(s) => { if (s) setMyStatus(s); setComposing(false) }} />}
    </>
  )
}

export function StatusComposer({ onDone }: { onDone: (s: MyStatus | null) => void }) {
  const [emoji, setEmoji] = useState('sun')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function share() {
    setSaving(true)
    setError('')
    try {
      const r = await api.post('/statuses', { emoji, text: text.trim() })
      onDone({ ...r.data.data })
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'That did not go through. Try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(74,36,36,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => onDone(null)}>
      <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, marginBottom: '14px', color: 'var(--ink)' }}>How's your heart?</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {STATUS_EMOJI.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} style={{
              width: '44px', height: '44px', borderRadius: '22px', cursor: 'pointer',
              background: emoji === e ? 'var(--selected-fill)' : 'var(--card)',
              border: emoji === e ? '1.5px dashed var(--outline)' : '1px solid var(--outline)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <QEmoji name={e} size={26} />
            </button>
          ))}
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 60))}
          placeholder="Sixty characters of honesty"
          style={{
            width: '100%', height: '48px', padding: '0 14px', borderRadius: '10px',
            border: '1px solid var(--outline)', outline: 'none', background: 'var(--card)',
            fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)',
          }}
          onFocus={(e) => { e.target.style.border = '1.5px solid var(--ink)' }}
          onBlur={(e) => { e.target.style.border = '1px solid var(--outline)' }}
        />
        <p style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', textAlign: 'right', margin: '6px 0 14px' }}>{text.length}/60</p>
        {error && <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--error)', marginBottom: '10px' }}>{error}</p>}
        <button
          disabled={!text.trim() || saving}
          onClick={share}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '56px',
            borderRadius: '28px', border: '2px solid var(--outline)', cursor: 'pointer',
            background: 'var(--btn)', color: 'var(--ink)', opacity: !text.trim() || saving ? 0.45 : 1,
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
        >
          {saving ? 'Sharing…' : 'Share status'}
        </button>
      </div>
    </div>
  )
}
