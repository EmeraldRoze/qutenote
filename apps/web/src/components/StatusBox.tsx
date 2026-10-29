import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import QEmoji from './QEmoji'
import { STATUS_EMOJI } from './Happenings'

// Your status box (Home + Profile), palette 4: a perforated postage-stamp box
// (.qn-stamp) with the pen emoji as the post button. Per Emerald's Oct 16
// feedback: a status is a standing thing, not a post — once set, it shows with
// a little pencil, and editing opens the emoji picker (the torn-paper set)
// plus the text.

interface Status { id?: string; emoji: string | null; text: string }

export default function StatusBox({ onPosted }: { onPosted?: (s: any) => void }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [emoji, setEmoji] = useState('thought-bubble')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.get('/statuses/mine')
      .then((r) => {
        const s = r.data.data
        if (s?.text) { setStatus(s); setText(s.text); setEmoji(s.emoji ?? 'thought-bubble') }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  async function save() {
    if (!text.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const r = await api.post('/statuses', { emoji, text: text.trim() })
      setStatus(r.data.data)
      setEditing(false)
      onPosted?.(r.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error ?? "That didn't go through. Try again.")
    } finally {
      setSaving(false)
    }
  }

  // The perforated stamp edge, paper strip, inner frame and light blue fill
  // are all drawn by .qn-stamp — the element itself stays transparent.
  const shell: React.CSSProperties = {
    border: '10px solid transparent', background: 'transparent',
    padding: '12px 8px 12px 10px',
  }

  // A status is set and we're not editing. No pen any more: the whole stamp
  // is the tap target (Emerald, Oct 27).
  if (loaded && status && !editing) {
    return (
      <div
        className="qn-stamp"
        role="button"
        tabIndex={0}
        aria-label="Edit your status"
        onClick={() => setEditing(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditing(true) }}
        style={{ ...shell, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
      >
        <QEmoji name={status.emoji ?? 'thought-bubble'} size={34} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>Your status</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status.text}
          </span>
        </span>
      </div>
    )
  }

  // No status yet, or editing: tap the emoji to pop up the picker
  // (Emerald's call: emojis hidden until you ask for them).
  return (
    // zIndex: .qn-stamp isolates, so the picker was trapped under the carousel
    // card below it (Emerald, Oct 24). Lift the whole box over the cards; the
    // tab bar still sits above at 50.
    <div className="qn-stamp" style={{ ...shell, position: 'relative', zIndex: 30, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Pick your status emoji"
          style={{
            flexShrink: 0, width: '44px', height: '44px', border: 0, background: 'transparent',
            cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <QEmoji name={emoji} size={34} />
        </button>
        <label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
            <span>Your status</span>
            <span>{text.length}/60</span>
          </span>
          <input
            value={text}
            maxLength={60}
            autoFocus={editing}
            onChange={(e) => setText(e.target.value.slice(0, 60))}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            placeholder="What's going on this week?"
            style={{
              border: 0, outline: 'none', background: 'transparent', padding: 0,
              fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%',
            }}
          />
        </label>
        {/* bye-bye pen (Emerald, Oct 28): the word posts it, and so does Enter */}
        <button
          onClick={save}
          disabled={!text.trim() || saving}
          aria-label="Post your status"
          style={{
            flexShrink: 0, height: '44px', padding: '0 2px', border: 0, background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
            letterSpacing: '0.08em', textIndent: '0.08em', color: 'var(--ink)',
            opacity: !text.trim() || saving ? 0.4 : 1,
          }}
        >POST</button>
      </div>
      {/* The popup picker — only when the emoji is tapped */}
      {pickerOpen && (
        <div style={{
          position: 'absolute', left: '8px', right: '8px', top: 'calc(100% + 16px)', zIndex: 30,
          background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '16px',
          boxShadow: '0 10px 28px rgba(74,36,36,0.16)', padding: '10px',
          display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {STATUS_EMOJI.map((e) => (
            <button key={e} onClick={() => { setEmoji(e); setPickerOpen(false) }} aria-label={`Status emoji ${e}`} style={{
              width: '44px', height: '44px', borderRadius: '22px', cursor: 'pointer',
              background: emoji === e ? 'var(--selected-fill)' : 'transparent',
              border: emoji === e ? '1.5px dashed var(--outline)' : '1.5px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>
              <QEmoji name={e} size={28} />
            </button>
          ))}
        </div>
      )}
      {error && (
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--error)' }}>{error}</span>
      )}
    </div>
  )
}
