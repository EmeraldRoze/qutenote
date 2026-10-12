import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'
import { STATUS_EMOJI } from '../components/Happenings'

const uv = '#5A32D6'
const fieldStyle: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none', background: 'transparent',
  fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)', padding: 0,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--ink-mid)', marginBottom: '4px',
}
const rowDivider: React.CSSProperties = { padding: '12px 18px', borderBottom: '1px solid var(--stone)' }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const THIS_YEAR = new Date().getFullYear()

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const existing = user?.birthday ? user.birthday.slice(0, 10).split('-') : null // [year, month, day]
  const [bYear, setBYear] = useState(existing?.[0] ?? '')
  const [bMonth, setBMonth] = useState(existing ? String(Number(existing[1])) : '')
  const [bDay, setBDay] = useState(existing ? String(Number(existing[2])) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const initials = (displayName || user?.username || '?').slice(0, 2).toUpperCase()

  async function save() {
    setSaving(true)
    setError('')
    setSaved(false)
    const birthday = bYear && bMonth && bDay ? `${bYear}-${bMonth.padStart(2, '0')}-${bDay.padStart(2, '0')}` : ''
    try {
      await api.put('/users/me', { displayName: displayName.trim(), ...(birthday ? { birthday } : {}) })
      refreshUser?.()
      setSaved(true)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "That didn't save. Try again.")
    } finally {
      setSaving(false)
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
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)' }}>Account</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '84px', height: '84px' }}>
            <div style={{
              width: '84px', height: '84px', borderRadius: '42px', background: 'var(--lavender-pale)',
              border: '1px solid var(--lavender-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {user?.avatarUrl?.startsWith('/emoji/')
                ? <QEmoji name={user.avatarUrl.replace('/emoji/', '').replace('.png', '')} size={46} />
                : user?.avatarUrl
                  ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--ink)' }}>{initials}</span>}
            </div>
            <button onClick={() => setPickingAvatar(true)} aria-label="Change avatar" style={{
              position: 'absolute', right: '-2px', bottom: '-2px', width: '28px', height: '28px', borderRadius: '14px',
              background: uv, border: '2px solid var(--cream)', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', lineHeight: 1,
            }}>+</button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '18px', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
          <div style={rowDivider}>
            <label style={labelStyle}>Name</label>
            <input style={fieldStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
          </div>
          <div style={rowDivider}>
            <label style={labelStyle}>Username</label>
            <p style={{ ...fieldStyle, color: 'var(--ink-mid)' }}>@{user?.username}</p>
          </div>
          <div style={rowDivider}>
            <label style={labelStyle}>Email</label>
            <p style={{ ...fieldStyle, color: 'var(--ink-mid)' }}>{user?.email}</p>
          </div>
          <div style={{ ...rowDivider, borderBottom: 'none' }}>
            <label style={labelStyle}>Birthday</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={bMonth} onChange={(e) => setBMonth(e.target.value)} style={{ ...fieldStyle, flex: 1.6 }}>
                <option value="" disabled>Month</option>
                {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
              </select>
              <select value={bDay} onChange={(e) => setBDay(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
                <option value="" disabled>Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={String(d)}>{d}</option>)}
              </select>
              <select value={bYear} onChange={(e) => setBYear(e.target.value)} style={{ ...fieldStyle, flex: 1.2 }}>
                <option value="" disabled>Year</option>
                {Array.from({ length: 100 }, (_, i) => THIS_YEAR - i).map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: '#B3261E' }}>{error}</p>}
        {saved && <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: uv }}>Saved.</p>}

        <button
          onClick={save}
          disabled={saving || !displayName.trim()}
          style={{
            height: '50px', borderRadius: '10px', border: 'none', cursor: saving ? 'default' : 'pointer',
            background: uv, color: '#fff', opacity: saving || !displayName.trim() ? 0.6 : 1,
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        <button onClick={() => setConfirmingDelete(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center',
          fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--error)', padding: '4px 0 20px',
        }}>
          Delete account
        </button>
      </div>

      {pickingAvatar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,56,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setPickingAvatar(false)}>
          <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, marginBottom: '14px' }}>Pick your emoji</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {STATUS_EMOJI.map((e) => (
                <button key={e} onClick={async () => {
                  await api.put('/users/me', { avatarUrl: `/emoji/${e}.png` })
                  refreshUser?.()
                  setPickingAvatar(false)
                }} style={{
                  width: '52px', height: '52px', borderRadius: '26px', cursor: 'pointer',
                  background: '#fff', border: '1px solid var(--stone)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <QEmoji name={e} size={32} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,56,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setConfirmingDelete(false)}>
          <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, marginBottom: '10px' }}>Delete your account?</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', marginBottom: '20px' }}>
              This isn't wired up to actually delete anything yet. Email us and we'll take care of it by hand for now.
            </p>
            <a href="mailto:emma@final.co" style={{
              display: 'block', height: '48px', lineHeight: '48px', borderRadius: '10px', textDecoration: 'none',
              background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px',
            }}>Email us</a>
            <button onClick={() => setConfirmingDelete(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)', padding: '6px',
            }}>Never mind</button>
          </div>
        </div>
      )}
    </div>
  )
}
