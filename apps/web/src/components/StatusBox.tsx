import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import QEmoji from './QEmoji'

// The always-visible status composer box from the Oct 15 redesign (10-home).
// Self-contained: prefills the person's current status on mount, posts a new
// one on POST. Used on Home (and importable anywhere else, e.g. Profile).

const uv = '#5A32D6'

export default function StatusBox({ onPosted }: { onPosted?: (s: any) => void }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/statuses/mine')
      .then((r) => { const s = r.data.data; if (s?.text) setText(s.text) })
      .catch(() => {})
  }, [])

  async function post() {
    if (!text.trim() || saving) return
    setSaving(true)
    setError('')
    setPosted(false)
    try {
      const r = await api.post('/statuses', { emoji: 'thought-bubble', text: text.trim() })
      setPosted(true)
      onPosted?.(r.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error ?? "That didn't go through. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: '#fff', border: `2px solid ${uv}`, borderRadius: '18px',
      padding: '10px 10px 10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <QEmoji name="thought-bubble" size={34} style={{ flexShrink: 0 }} />
      <label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>
          <span>Your status</span>
          <span>{text.length}/60</span>
        </span>
        <input
          value={text}
          maxLength={60}
          onChange={(e) => { setText(e.target.value.slice(0, 60)); setPosted(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') post() }}
          placeholder="What's going on this week?"
          style={{
            border: 0, outline: 'none', background: 'transparent', padding: 0,
            fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%',
          }}
        />
        {error && (
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--error)' }}>{error}</span>
        )}
      </label>
      <button
        onClick={post}
        disabled={!text.trim() || saving}
        style={{
          flexShrink: 0, height: '44px', padding: '0 16px', border: 0, borderRadius: '22px',
          background: uv, color: '#fff', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em',
          opacity: !text.trim() || saving ? 0.55 : 1,
        }}
      >
        {saving ? '…' : posted ? 'POSTED' : 'POST'}
      </button>
    </div>
  )
}
