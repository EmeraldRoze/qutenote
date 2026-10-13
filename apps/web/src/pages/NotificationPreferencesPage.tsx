import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const uv = '#5A32D6'

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

export default function NotificationPreferencesPage() {
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/users/me/notification-preferences').then((r) => setPrefs(r.data.data)).catch(() => setError("Couldn't load your preferences."))
  }, [])

  async function toggle(key: keyof Prefs) {
    if (!prefs) return
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    try {
      await api.put('/users/me/notification-preferences', { [key]: next[key] })
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
          width: '36px', height: '36px', borderRadius: '50%', background: 'var(--lavender-pale)',
          border: 'none', cursor: 'pointer', color: uv, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)' }}>Notifications</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
        {error && <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--error)', marginBottom: '14px' }}>{error}</p>}

        {!prefs ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '14px', padding: '40px 0' }}>Loading…</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: '18px', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
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
                    background: prefs[row.key] ? uv : 'var(--stone)', position: 'relative', transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px', left: prefs[row.key] ? '21px' : '3px',
                    width: '22px', height: '22px', borderRadius: '11px', background: '#fff',
                    boxShadow: '0 1px 3px rgba(43,34,56,0.3)', transition: 'left 0.15s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
