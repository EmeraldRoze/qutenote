import { useEffect, useState } from 'react'
import { listDrafts } from '../lib/drafts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { enableReminders, remindersEnabled, lastReminderFailure, type ReminderResult } from '../lib/push'
import { isNativeApp } from '../lib/native'
import { fetchHandwritingProgress } from '../lib/handwriting/api'
import QIcon from '../components/QIcon'

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
  <QIcon name="chevron-right" size={14} />
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
            <QIcon name="chevron-left" size={18} />
          </button>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Settings</h1>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h2 className="on-paper" style={{ margin: '24px 20px 8px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>Your account</h2>

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

          {/* Privacy flips right here, no explainer line underneath
              (Emerald, Oct 25) */}
          <div style={{ ...rowStyle, cursor: 'default' }}>
            <span style={rowLabel}>Privacy</span>
            <span style={rowValue}>{user?.isPrivate ? 'Private' : 'Public'}</span>
            <button
              role="switch"
              aria-checked={!!user?.isPrivate}
              aria-label="Private account"
              onClick={togglePrivacy}
              style={{
                width: '52px', height: '32px', flex: 'none', borderRadius: '16px',
                border: '1.5px solid var(--stone)', background: user?.isPrivate ? 'var(--lime)' : '#D9CFC2',
                position: 'relative', padding: 0, cursor: 'pointer',
              }}
            >
              <span style={{
                position: 'absolute', top: '2px', left: user?.isPrivate ? '22px' : '2px',
                width: '25px', height: '25px', borderRadius: '50%', background: 'var(--card)',
                border: '1.5px solid var(--stone)', boxSizing: 'border-box', transition: 'left 0.15s ease',
              }} />
            </button>
          </div>

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
            <QIcon name="shush" size={22} style={{ marginRight: '8px' }} />
            {chevron}
          </button>

          <a href="mailto:hello@qutenote.com" style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={rowLabel}>Get help</span>
            <span style={rowValue} />
            {chevron}
          </a>
        </div>

        {/* Log out wears the same square stamp as LOGIN, centered
            (Emerald, Oct 25) */}
        <div className="qn-actions" style={{ marginTop: '28px' }}>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="qn-stamp qn-action qn-action-square"
          >
            LOG OUT
          </button>
        </div>
      </div>
    </div>
  )
}
