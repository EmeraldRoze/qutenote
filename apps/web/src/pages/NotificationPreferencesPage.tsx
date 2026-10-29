import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { enableReminders, remindersEnabled } from '../lib/push'
import { isNativeApp } from '../lib/native'
import QIcon from '../components/QIcon'
import QEmoji from '../components/QEmoji'

interface Prefs {
  notifyBirthdays: boolean
  notifyFriendSentCard: boolean
  notifyFriendRequestAccepted: boolean
  notifyInviteUsed: boolean
  notifyFriendStatusUpdate: boolean
}

const ROWS: { key: keyof Prefs; label: string; detail: string }[] = [
  { key: 'notifyBirthdays', label: 'Birthday reminders', detail: "A nudge 7 days before someone's important date" },
  { key: 'notifyFriendSentCard', label: 'Someone sent you a card', detail: "The moment a friend's card is on its way" },
  { key: 'notifyFriendRequestAccepted', label: 'QT request accepted', detail: 'When someone accepts your request to connect' },
  { key: 'notifyInviteUsed', label: 'Invite link used', detail: 'When someone you invited shares their address' },
  { key: 'notifyFriendStatusUpdate', label: 'Friend status updates', detail: "When a QT shares what's new with them" },
]

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

export default function NotificationPreferencesPage() {
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [error, setError] = useState('')

  // The bell holds two things now: what happened, and what you want to hear
  // about (Emerald, Oct 28).
  const [tab, setTab] = useState<'inbox' | 'settings'>('inbox')
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

  useEffect(() => {
    api.get('/users/me/notification-preferences').then((r) => setPrefs(r.data.data)).catch(() => setError("Couldn't load your preferences."))
  }, [])

  async function toggle(key: keyof Prefs) {
    if (!prefs) return
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    try {
      await api.put('/users/me/notification-preferences', { [key]: next[key] })
      // Turning a preference ON should also register this phone for pushes —
      // the preferences mean nothing if the device never signed up for alerts.
      if (next[key] && isNativeApp && !remindersEnabled()) enableReminders().catch(() => {})
    } catch {
      setPrefs(prefs)
      setError("That didn't save. Try again.")
    }
  }

  // The "I wanna know about everything" switch: all five on, or all five off.
  const allOn = !!prefs && ROWS.every((r) => prefs[r.key])
  async function toggleAll() {
    if (!prefs) return
    const value = !allOn
    const next = Object.fromEntries(ROWS.map((r) => [r.key, value])) as unknown as Prefs
    setPrefs(next)
    try {
      await api.put('/users/me/notification-preferences', next)
      if (value && isNativeApp && !remindersEnabled()) enableReminders().catch(() => {})
    } catch {
      setPrefs(prefs)
      setError("That didn't save. Try again.")
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{
        background: 'var(--cream)', borderBottom: '1px solid var(--stone)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{
          width: '44px', height: '44px', borderRadius: '50%', background: '#E3D5CC',
          border: 'none', cursor: 'pointer', color: '#4A2424', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <QIcon name="chevron-left" size={18} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 300, color: 'var(--ink)' }}>Notifications</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
        {error && <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--error)', marginBottom: '14px' }}>{error}</p>}

        {/* folder tabs, same as QTs and Dates */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '-1.5px', position: 'relative', zIndex: 1 }}>
          {([['inbox', 'WHAT HAPPENED'], ['settings', 'SETTINGS']] as const).map(([key, text]) => {
            const on = tab === key
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                border: '1.5px solid var(--stone)', borderBottomColor: on ? 'var(--card)' : 'var(--stone)',
                background: on ? 'var(--card)' : 'var(--paper)',
                borderRadius: '12px 12px 0 0', padding: '9px 16px', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.06em', textIndent: '0.06em', color: 'var(--ink)', opacity: on ? 1 : 0.55,
              }}>{text}</button>
            )
          })}
        </div>

        <div style={{ background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '0 16px 16px 16px', padding: '6px 16px 14px' }}>
        {tab === 'inbox' ? (
          notes === null ? (
            <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '14px', padding: '30px 0', fontFamily: 'var(--font-body)' }}>Loading…</p>
          ) : notes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--ink)', fontSize: '14px', padding: '30px 10px', fontFamily: 'var(--font-body)' }}>
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
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)', opacity: 0.6, marginTop: '2px' }}>{whenPosted(n.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
          )
        ) : !prefs ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '14px', padding: '40px 0' }}>Loading…</p>
        ) : (
          <>
          {/* Master switch */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
            padding: '16px 18px', marginBottom: '14px', background: '#F4ECE6',
            border: '2px dashed #B4897A', borderRadius: '18px',
          }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Everything</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)', margin: '2px 0 0' }}>I wanna know about all of it</p>
            </div>
            <button
              onClick={toggleAll}
              aria-label={`Turn everything ${allOn ? 'off' : 'on'}`}
              style={{
                width: '46px', height: '28px', minWidth: '46px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                background: allOn ? '#EEFC4E' : '#EBDDD6', position: 'relative', transition: 'background 0.15s',
              }}
            >
              <span style={{
                position: 'absolute', top: '3px', left: allOn ? '21px' : '3px',
                width: '22px', height: '22px', borderRadius: '11px', background: 'var(--card)',
                boxShadow: '0 1px 3px rgba(74,36,36,0.3)', transition: 'left 0.15s',
              }} />
            </button>
          </div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '18px', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            {ROWS.map((row, i) => (
              <div key={row.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
                padding: '16px 18px', borderBottom: i < ROWS.length - 1 ? '1px solid var(--stone)' : 'none',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{row.label}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)', margin: '2px 0 0' }}>{row.detail}</p>
                </div>
                <button
                  onClick={() => toggle(row.key)}
                  aria-label={`Turn ${row.label} ${prefs[row.key] ? 'off' : 'on'}`}
                  style={{
                    width: '46px', height: '28px', minWidth: '46px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                    background: prefs[row.key] ? '#EEFC4E' : '#EBDDD6', position: 'relative', transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px', left: prefs[row.key] ? '21px' : '3px',
                    width: '22px', height: '22px', borderRadius: '11px', background: 'var(--card)',
                    boxShadow: '0 1px 3px rgba(74,36,36,0.3)', transition: 'left 0.15s',
                  }} />
                </button>
              </div>
            ))}
          </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
