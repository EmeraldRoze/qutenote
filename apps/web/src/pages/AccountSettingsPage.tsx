import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'
import { STATUS_EMOJI } from '../components/Happenings'

// Account — Oct 15 2026 redesign, screen 17-account.html. No tab bar.
// Every field is editable; username/email clashes come back as a 409 with a
// friendly message. Delete account is required by Apple — it asks the person
// to type DELETE before anything happens.

const uv = '#5A32D6'

const fieldStyle: React.CSSProperties = {
  border: 0, outline: 'none', background: 'transparent', padding: 0,
  fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--ink)', width: '100%',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)',
}
const rowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px',
  borderBottom: '1.5px solid var(--divider)',
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const { user, refreshUser, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [birthday, setBirthday] = useState(user?.birthday ? user.birthday.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const payload: Record<string, string> = { displayName: displayName.trim() }
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '')
      if (cleanUsername && cleanUsername !== user?.username) payload.username = cleanUsername
      const cleanEmail = email.trim()
      if (cleanEmail && cleanEmail !== user?.email) payload.email = cleanEmail
      if (birthday) payload.birthday = birthday
      await api.put('/users/me', payload)
      refreshUser?.()
      setSaved(true)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "That didn't save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    if (deleteText.trim().toUpperCase() !== 'DELETE') return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete('/account')
      logout()
      navigate('/welcome')
    } catch {
      setDeleteError("That didn't go through. Nothing was deleted — try again.")
      setDeleting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Title band */}
      <div className="title-band" style={{ height: '144px', boxSizing: 'border-box', flex: 'none' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(-1)} aria-label="Back to Settings" style={{
            width: '44px', height: '44px', flex: 'none', borderRadius: '50%', background: 'var(--lavender-light)',
            border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Account</h1>
        </div>
      </div>

      <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px 34px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Avatar */}
        <div style={{ marginTop: '26px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '96px', height: '96px' }}>
            <span style={{
              width: '96px', height: '96px', boxSizing: 'border-box', borderRadius: '50%',
              background: 'var(--lavender-pale)', border: '4px solid var(--cream)', boxShadow: '0 0 0 2px var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--ink)',
            }}>
              {user?.avatarUrl?.startsWith('/emoji/')
                ? <QEmoji name={user.avatarUrl.replace('/emoji/', '').replace('.png', '')} size={54} />
                : user?.avatarUrl
                  ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initialsOf(displayName || user?.username || '?')}
            </span>
            <button onClick={() => setPickingAvatar(true)} aria-label="Pick an emoji or add a photo" style={{
              position: 'absolute', right: '-4px', bottom: '-2px', width: '38px', height: '38px', borderRadius: '50%',
              border: '3px solid var(--cream)', background: uv, color: '#fff', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        {/* Fields */}
        <div style={{ marginTop: '26px', background: '#fff', border: '1.5px solid var(--stone)', borderRadius: '18px', overflow: 'hidden' }}>
          <label style={rowStyle}>
            <span style={labelStyle}>Name</span>
            <input value={displayName} onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }} maxLength={50} style={fieldStyle} />
          </label>
          <label style={rowStyle}>
            <span style={labelStyle}>Username</span>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '17px' }}>
              <span style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>@</span>
              <input value={username} onChange={(e) => { setUsername(e.target.value); setSaved(false) }} maxLength={20} autoCapitalize="none" autoCorrect="off" style={fieldStyle} />
            </span>
          </label>
          <label style={rowStyle}>
            <span style={labelStyle}>Email</span>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false) }} autoCapitalize="none" autoCorrect="off" style={fieldStyle} />
          </label>
          <label style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Your birthday</span>
            <input type="date" value={birthday} onChange={(e) => { setBirthday(e.target.value); setSaved(false) }} style={fieldStyle} />
          </label>
        </div>
        <p style={{ margin: '10px 4px 0', fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.45, color: 'var(--ink-mid)' }}>
          We'll send you a Qute Note when it rolls around.
        </p>

        {/* Bottom: status + save + delete */}
        <div style={{ marginTop: 'auto', paddingTop: '26px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {error && (
            <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--error)' }}>{error}</p>
          )}
          {saved && !error && (
            <p role="status" style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: uv }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="M8 12.5l2.7 2.7L16 9.5" /></svg>
              Saved
            </p>
          )}
          <button
            onClick={save}
            disabled={saving || !displayName.trim()}
            style={{
              height: '56px', border: 0, borderRadius: '28px', background: uv, color: '#fff',
              fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em',
              cursor: saving ? 'default' : 'pointer', opacity: saving || !displayName.trim() ? 0.6 : 1,
            }}
          >
            {saving ? 'SAVING…' : 'SAVE CHANGES'}
          </button>
          <button onClick={() => { setConfirmingDelete(true); setDeleteText(''); setDeleteError('') }} style={{
            minHeight: '44px', border: 0, background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', textDecoration: 'underline',
            textTransform: 'none', letterSpacing: 0, fontWeight: 400,
          }}>
            Delete account
          </button>
        </div>
      </div>

      {pickingAvatar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,58,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setPickingAvatar(false)}>
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
                  background: '#fff', border: '1.5px solid var(--stone)',
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,58,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => !deleting && setConfirmingDelete(false)}>
          <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', textAlign: 'center', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, marginBottom: '10px' }}>Delete your account?</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.5, color: 'var(--ink-mid)', marginBottom: '16px' }}>
              This erases your account, your cards and your address for good. There's no undo. Type DELETE below if you're sure.
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type DELETE"
              autoCapitalize="characters"
              autoCorrect="off"
              style={{
                width: '100%', boxSizing: 'border-box', height: '52px', padding: '0 16px', marginBottom: '12px',
                borderRadius: '14px', border: '1.5px solid var(--stone)', background: '#fff', outline: 'none',
                fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', textAlign: 'center',
              }}
            />
            {deleteError && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--error)', marginBottom: '12px' }}>{deleteError}</p>
            )}
            <button
              onClick={deleteAccount}
              disabled={deleting || deleteText.trim().toUpperCase() !== 'DELETE'}
              style={{
                width: '100%', height: '56px', borderRadius: '28px', border: 'none',
                background: 'var(--error)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em',
                cursor: 'pointer', opacity: deleting || deleteText.trim().toUpperCase() !== 'DELETE' ? 0.5 : 1,
                marginBottom: '10px',
              }}
            >
              {deleting ? 'DELETING…' : 'DELETE MY ACCOUNT'}
            </button>
            <button onClick={() => setConfirmingDelete(false)} disabled={deleting} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontSize: '14px', color: 'var(--ink-mid)', padding: '8px', textTransform: 'none', letterSpacing: 0,
            }}>Never mind</button>
          </div>
        </div>
      )}
    </div>
  )
}
