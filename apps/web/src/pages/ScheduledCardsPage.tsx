import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'

// Scheduled cards (Settings → Scheduled cards): everything waiting to mail,
// editable or cancelable until the day it goes to print.

interface ScheduledNote {
  id: string
  noteText: string
  scheduledFor: string
  mailAt: string
  recipient: { id: string; displayName: string; username: string }
}

function pretty(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ScheduledCardsPage() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<ScheduledNote[] | null>(null)
  const [cancelArmed, setCancelArmed] = useState<string | null>(null)
  const [error, setError] = useState('')

  function load() {
    api.get('/notes/scheduled').then((r) => setNotes(r.data.data)).catch(() => setNotes([]))
  }
  useEffect(load, [])

  async function cancel(id: string) {
    if (cancelArmed !== id) {
      setCancelArmed(id)
      setTimeout(() => setCancelArmed((c) => (c === id ? null : c)), 4000)
      return
    }
    try {
      await api.delete(`/notes/${id}`)
      setCancelArmed(null)
      load()
    } catch (err: any) {
      setError(err.response?.data?.error ?? "That didn't work. Try again.")
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <nav style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{
          width: '44px', height: '44px', borderRadius: '50%', background: '#E3D5CC',
          border: 'none', cursor: 'pointer', color: '#4A2424', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 300, color: 'var(--ink)' }}>Scheduled cards</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', margin: '0 0 18px', lineHeight: 1.5 }}>
          Cards waiting for their moment. We mail each one a few days ahead so it lands close to the date — editable until it goes to print.
        </p>

        {error && <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--error)', marginBottom: '12px' }}>{error}</p>}

        {notes === null ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontFamily: 'var(--font-body)', fontSize: '14px', padding: '30px 0' }}>One sec…</p>
        ) : notes.length === 0 ? (
          <div style={{ padding: '26px 20px', borderRadius: '20px', background: '#F4ECE6', border: '2px dashed #B4897A', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <QEmoji name="calendar" size={52} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.45, margin: 0 }}>
              Nothing scheduled yet. When you send a card, pick "Schedule it" and we'll hold it for the big day.
            </p>
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} style={{ background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '18px', padding: '14px 16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                  To {n.recipient.displayName}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, background: 'var(--lime)', borderRadius: '10px', padding: '3px 9px', whiteSpace: 'nowrap' }}>
                  {pretty(n.scheduledFor)}
                </span>
              </div>
              <p style={{ margin: '6px 0 2px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                “{n.noteText}”
              </p>
              <p style={{ margin: '0 0 10px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-muted)' }}>
                Mails around {pretty(n.mailAt)}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => navigate(`/send?edit=${n.id}`)} style={{
                  flex: 1, height: '42px', borderRadius: '21px', border: '2px solid #B4897A', background: '#FBF8F3',
                  color: '#4A2424', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em',
                }}>
                  Edit
                </button>
                <button onClick={() => cancel(n.id)} style={{
                  flex: 1, height: '42px', borderRadius: '21px', cursor: 'pointer',
                  border: `2px solid ${cancelArmed === n.id ? 'var(--error)' : '#B4897A'}`,
                  background: cancelArmed === n.id ? 'var(--error-pale)' : '#FBF8F3',
                  color: cancelArmed === n.id ? 'var(--error)' : 'var(--ink-mid)',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em',
                }}>
                  {cancelArmed === n.id ? 'Tap again to cancel' : 'Cancel card'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
