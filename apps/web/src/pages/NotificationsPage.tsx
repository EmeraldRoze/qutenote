import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import QIcon from '../components/QIcon'
import QEmoji from '../components/QEmoji'

// The bell on your profile: what actually happened. The switches for what you
// want to hear about live in Settings now (Emerald, Oct 29).

interface Note {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

const NOTE_ART: Record<string, string> = {
  NOTE_SENT: 'envelope',
  NOTE_INCOMING: 'mailbox',
  OCCASION_REMINDER: 'cake',
  STREAK_NUDGE: 'star',
  BADGE_EARNED: 'star',
  PASS_IT_FORWARD_RECEIVED: 'gift',
  NEW_FOLLOWER: 'bff',
  ARTIST_APPLICATION: 'palette',
  ARTIST_APPROVED: 'palette',
  ARTIST_CARD_APPROVED: 'palette',
  ARTIST_CARD_SENT: 'envelope',
}

function whenPosted(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.round(days / 7)
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[] | null>(null)

  useEffect(() => {
    api.get('/notifications')
      .then((r) => {
        setNotes(r.data.data)
        // she is looking at them, so they are checked
        if (r.data.data.some((n: Note) => !n.isRead)) {
          api.post('/notifications/read')
            .then(() => window.dispatchEvent(new Event('qn-notifications-read')))
            .catch(() => {})
        }
      })
      .catch(() => setNotes([]))
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{
        background: 'var(--cream)', borderBottom: '1px solid var(--stone)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{
          width: '44px', height: '44px', borderRadius: '50%', background: 'var(--light-blush)',
          border: 'none', cursor: 'pointer', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <QIcon name="chevron-left" size={18} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 300, color: 'var(--ink)' }}>What happened</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
        {notes === null ? (
          <p style={{ textAlign: 'center', color: 'var(--ink)', fontSize: '14px', padding: '40px 0', fontFamily: 'var(--font-body)' }}>Loading…</p>
        ) : notes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--ink)', fontSize: '14px', padding: '40px 10px', fontFamily: 'var(--font-body)' }}>
            Nothing yet. When a QT accepts you, a card lands, or a birthday is close, it shows up here.
          </p>
        ) : (
          <div>
            {notes.map((n, i) => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '11px', padding: '12px 0',
                borderBottom: i === notes.length - 1 ? 'none' : '1.5px solid rgba(180,137,122,0.3)',
              }}>
                <QEmoji name={NOTE_ART[n.type] ?? 'thought-bubble'} size={28} style={{ flex: 'none', height: 'auto', marginTop: '2px' }} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>{n.title}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>{n.body}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)', opacity: 0.75, marginTop: '2px' }}>{whenPosted(n.createdAt)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
