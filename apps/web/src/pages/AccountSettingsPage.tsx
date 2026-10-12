import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const uv = '#5A32D6'
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 16px', fontSize: '14px', boxSizing: 'border-box',
  borderRadius: '10px', border: '1.5px solid var(--border-default)',
  background: '#fff', color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-body)',
}
const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [birthday, setBirthday] = useState(user?.birthday ? user.birthday.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    setSaved(false)
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
        <div>
          <p style={labelStyle}>Name</p>
          <input style={inputStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
        </div>
        <div>
          <p style={labelStyle}>Email</p>
          <input style={{ ...inputStyle, color: 'var(--ink-muted)', background: 'var(--stone)' }} value={user?.email ?? ''} disabled />
        </div>
        <div>
          <p style={labelStyle}>Your birthday</p>
          <input type="date" style={inputStyle} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          <p style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', marginTop: '6px' }}>
            We'll send you a Qute Note when it rolls around.
          </p>
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
      </div>
    </div>
  )
}
