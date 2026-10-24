import { useEffect, useState } from 'react'
import { listDrafts } from '../lib/drafts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { enableReminders, remindersEnabled, lastReminderFailure, type ReminderResult } from '../lib/push'
import { isNativeApp } from '../lib/native'
import { fetchHandwritingProgress } from '../lib/handwriting/api'

// Settings, palette 4 restyle of screen 16-settings.html. No tab bar.
// Free mode: no Membership or Payment methods rows.

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', width: '100%', minHeight: '50px', boxSizing: 'border-box',
  padding: '0 20px', background: 'var(--card)', border: 'none', borderBottom: '1px solid var(--stone)',
  cursor: 'pointer', textAlign: 'left', textTransform: 'none', letterSpacing: 0, fontWeight: 400,
  textDecoration: 'none', color: 'var(--ink)',
}
const rowLabel: React.CSSProperties = { flex: 1, fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)' }
const rowValue: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', marginRight: '8px' }
const chevron = (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink)', flex: 'none' }}><path d="M9 5l7 7-7 7" /></svg>
)

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout, refreshUser } = useAuth()
  const [addressVerified, setAddressVerified] = useState<boolean | null>(null)
  const [reminderStatus, setReminderStatus] = useState<ReminderResult | 'idle' | 'working'>('idle')
  const [hasHandwriting, setHasHandwriting] = useState(false)
  const [scheduledCount, setScheduledCount] = useState(0)
  const draftCount = listDrafts().length

  useEffect(() => {
    api.get('/address/me')
      .then((r) => setAddressVerified(r.data.data ? !!r.data.data.isVerified : null))
      .catch(() => setAddressVerified(null))
    api.get('/notes/scheduled')
      .then((r) => setScheduledCount((r.data.data ?? []).length))
      .catch(() => {})
    fetchHandwritingProgress()
      .then((r) => setHasHandwriting(r.hasFont))
      .catch(() => {})
  }, [])

  async function toggleNotifications() {
    if (remindersEnabled()) return // iOS owns the off-switch; point people to Settings app
    setReminderStatus('working')
    const r = await enableReminders()
    setReminderStatus(r)
  }

  async function togglePrivacy() {
    await api.post('/connections/privacy', { isPrivate: !user?.isPrivate })
    refreshUser?.()
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>

      {/* Title band */}
      <div className="title-band" style={{ height: '144px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(-1)} aria-label="Back" style={{
            width: '44px', height: '44px', flex: 'none', borderRadius: '50%', background: 'var(--light-blush)',
            border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Settings</h1>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h2 style={{ margin: '24px 20px 8px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>Your account</h2>

        <div style={{ background: 'var(--card)', borderTop: '1.5px solid var(--stone)', borderBottom: '1.5px solid var(--stone)' }}>
          <button style={rowStyle} onClick={() => navigate('/settings/account')}>
            <span style={rowLabel}>Account</span>
            <span style={rowValue} />
            {chevron}
          </button>

          <button style={rowStyle} onClick={() => navigate('/settings/scheduled')}>
            <span style={rowLabel}>Scheduled cards</span>
            <span style={rowValue}>{scheduledCount || ''}</span>
            {chevron}
          </button>

          <button style={rowStyle} onClick={() => navigate('/send')}>
            <span style={rowLabel}>Drafts</span>
            <span style={rowValue}>{draftCount || ''}</span>
            {chevron}
          </button>

          <button style={rowStyle} onClick={() => navigate('/settings/address')}>
            <span style={rowLabel}>Your address</span>
            <span style={rowValue}>{addressVerified === null ? '' : addressVerified ? 'Verified' : 'Not verified'}</span>
            {chevron}
          </button>

          <button style={rowStyle} onClick={togglePrivacy}>
            <span style={rowLabel}>Privacy</span>
            <span style={rowValue}>{user?.isPrivate ? 'Private' : 'Public'}</span>
            {chevron}
          </button>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-muted)', padding: '0 20px 10px', background: 'var(--card)', borderBottom: '1px solid var(--stone)' }}>
            {user?.isPrivate
              ? 'Private: your sends stay off feeds. Tap to go public.'
              : "Public: your sends show on your QTs' feeds. Tap to go private."}
          </p>

          <button
            style={{ ...rowStyle, cursor: isNativeApp ? 'pointer' : 'default' }}
            onClick={isNativeApp ? (remindersEnabled() ? () => navigate('/settings/notifications') : toggleNotifications) : undefined}
            disabled={!isNativeApp || reminderStatus === 'working'}
          >
            <span style={rowLabel}>Notifications</span>
            <span style={rowValue}>
              {!isNativeApp ? 'App only' : remindersEnabled() ? 'On' : reminderStatus === 'working' ? 'Turning on…' : 'Off'}
            </span>
            {isNativeApp && chevron}
          </button>
          {reminderStatus === 'denied' && (
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)', padding: '0 20px 10px', background: 'var(--card)', borderBottom: '1px solid var(--stone)' }}>
              Notifications are off in your iPhone Settings. Open Settings → QuteNote → Notifications to allow them.
            </p>
          )}
          {reminderStatus === 'failed' && (
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)', padding: '0 20px 10px', background: 'var(--card)', borderBottom: '1px solid var(--stone)' }}>
              That didn't go through{lastReminderFailure() ? ` (${lastReminderFailure()})` : ''}. Try again in a moment.
            </p>
          )}

          <button style={rowStyle} onClick={() => navigate('/handwriting')}>
            <span style={rowLabel}>Handwriting</span>
            <span style={rowValue}>{hasHandwriting ? 'Set up' : 'Not set up'}</span>
            {chevron}
          </button>

          <button style={rowStyle} onClick={() => navigate('/secret-key')}>
            <span style={rowLabel}>Secret language</span>
            <span style={rowValue}>🤫</span>
            {chevron}
          </button>

          <a href="mailto:hello@qutenote.com" style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={rowLabel}>Get help</span>
            <span style={rowValue} />
            {chevron}
          </a>
        </div>

        <button
          onClick={() => { logout(); navigate('/') }}
          style={{
            display: 'block', margin: '22px 20px 0', padding: 0,
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)',
            textTransform: 'none', letterSpacing: 0, fontWeight: 400,
          }}
        >
          Log out
        </button>
      </div>
    </div>
  )
}
