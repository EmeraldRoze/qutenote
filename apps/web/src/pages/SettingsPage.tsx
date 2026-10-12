import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { enableReminders, remindersEnabled, lastReminderFailure, type ReminderResult } from '../lib/push'
import { isNativeApp } from '../lib/native'
import QEmoji from '../components/QEmoji'
import { fetchHandwritingProgress } from '../lib/handwriting/api'

// Settings — App Screens board screen 07. No tab bar; reached from the gear on Profile.
// Several rows link to real existing flows (Address, Membership, Privacy, Notifications).
// A few sub-pages the design doesn't cover yet (Payment methods, Scheduled cards detail,
// Get help) fall back to the closest working screen rather than invent new ones.

const uv = '#5A32D6'
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
  padding: '16px 18px', background: '#fff', border: 'none', borderBottom: '1px solid var(--stone)',
  cursor: 'pointer', textAlign: 'left', textTransform: 'none', letterSpacing: 0, fontWeight: 400,
}
const rowLabel: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)' }
const rowValue: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', display: 'flex', alignItems: 'center', gap: '6px' }
const chevron = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
)

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [hasAddress, setHasAddress] = useState<boolean | null>(null)
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)
  const [reminderStatus, setReminderStatus] = useState<ReminderResult | 'idle' | 'working'>('idle')
  const [showHelp, setShowHelp] = useState(false)
  const [hasHandwriting, setHasHandwriting] = useState(false)

  useEffect(() => {
    api.get('/address/me').then((r) => setHasAddress(!!r.data.data)).catch(() => setHasAddress(null))
    api.get('/notes/sent').then((r) => setScheduledCount(r.data.data.filter((n: any) => n.status === 'PENDING').length)).catch(() => {})
    fetchHandwritingProgress().then((r) => setHasHandwriting(r.hasFont)).catch(() => {})
  }, [])

  async function toggleNotifications() {
    if (remindersEnabled()) return // iOS owns the off-switch; point people to Settings app
    setReminderStatus('working')
    const r = await enableReminders()
    setReminderStatus(r)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--settings-bg, #F5F2EC)' }}>
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
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)' }}>Settings</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 0 60px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mid)', padding: '0 18px', marginBottom: '8px' }}>
          Your account
        </p>
        <div style={{ borderTop: '1px solid var(--stone)' }}>
          <button style={rowStyle} onClick={() => navigate('/settings/account')}>
            <span style={rowLabel}>Account</span>
            <span style={rowValue}>{chevron}</span>
          </button>
          <button style={rowStyle} onClick={() => navigate('/subscribe')}>
            <span style={rowLabel}>Membership</span>
            <span style={rowValue}>{user?.subscriptionStatus === 'ACTIVE' ? '$7.95/mo' : 'Not a member'}{chevron}</span>
          </button>
          <button style={rowStyle} onClick={() => navigate('/subscribe')}>
            <span style={rowLabel}>Payment methods</span>
            <span style={rowValue}>{chevron}</span>
          </button>
          <button style={rowStyle} onClick={() => navigate(`/profile/${user?.username ?? ''}`)}>
            <span style={rowLabel}>Scheduled cards</span>
            <span style={rowValue}>{scheduledCount ?? '—'}{chevron}</span>
          </button>
          <button style={rowStyle} onClick={() => navigate('/address')}>
            <span style={rowLabel}>Your address</span>
            <span style={rowValue}>{hasAddress === null ? '—' : hasAddress ? 'Verified' : 'Not set'}{chevron}</span>
          </button>
          <button style={rowStyle} onClick={() => navigate(`/profile/${user?.username ?? ''}`)}>
            <span style={rowLabel}>Privacy</span>
            <span style={rowValue}>{user?.isPrivate ? 'Private' : 'Public'}{chevron}</span>
          </button>
          <button
            style={rowStyle}
            onClick={isNativeApp ? toggleNotifications : undefined}
            disabled={!isNativeApp || reminderStatus === 'working'}
          >
            <span style={rowLabel}>Notifications</span>
            <span style={rowValue}>
              {!isNativeApp ? 'App only' : remindersEnabled() ? 'On' : reminderStatus === 'working' ? 'Turning on…' : 'Off'}
              {isNativeApp && chevron}
            </span>
          </button>
          {reminderStatus === 'denied' && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)', padding: '0 18px 10px' }}>
              Notifications are off in your iPhone Settings. Open Settings → QuteNote → Notifications to allow them.
            </p>
          )}
          {reminderStatus === 'failed' && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)', padding: '0 18px 10px' }}>
              That didn't go through{lastReminderFailure() ? ` (${lastReminderFailure()})` : ''}. Try again in a moment.
            </p>
          )}
          <button style={rowStyle} onClick={() => navigate('/handwriting')}>
            <span style={rowLabel}>Handwriting</span>
            <span style={rowValue}>{hasHandwriting ? 'Set up' : 'Not set up'}{chevron}</span>
          </button>
          <button style={rowStyle} onClick={() => setShowHelp(true)}>
            <span style={rowLabel}>Get help</span>
            <span style={rowValue}>{chevron}</span>
          </button>
        </div>

        <button
          onClick={() => { logout(); navigate('/') }}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '16px 18px', marginTop: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)',
            textTransform: 'none', letterSpacing: 0, fontWeight: 400,
          }}
        >
          Log out
        </button>
      </div>

      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,56,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowHelp(false)}>
          <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <QEmoji name="envelope" size={44} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, margin: '12px 0 8px' }}>Need a hand?</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', marginBottom: '16px' }}>
              Email us and we'll get back to you.
            </p>
            <a href="mailto:emma@final.co" style={{
              display: 'block', width: '100%', boxSizing: 'border-box', height: '48px', lineHeight: '48px',
              borderRadius: '10px', background: uv, color: '#fff', textDecoration: 'none',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>emma@final.co</a>
          </div>
        </div>
      )}
    </div>
  )
}
