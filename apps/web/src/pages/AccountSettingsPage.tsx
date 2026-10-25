import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { waxLetterSrc, WAX_CENTER_X, WAX_CENTER_Y, WAX_WIDTH } from '../lib/wax'
import QEmoji from '../components/QEmoji'
import { STATUS_EMOJI } from '../components/Happenings'

// Account ("Deets"), palette 4 restyle of screen 17-account.html. No tab bar.
// Every field is editable; username/email clashes come back as a 409 with a
// friendly message. Delete account is required by Apple, it asks the person
// to type DELETE before anything happens.

const fieldStyle: React.CSSProperties = {
  border: 0, outline: 'none', background: 'transparent', padding: 0,
  fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--ink)', width: '100%',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)',
}
const rowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px',
  borderBottom: '1.5px solid var(--stone)',
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
      setDeleteError("That didn't go through. Nothing was deleted, try again.")
      setDeleting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Title band */}
      <div className="title-band" style={{ height: '144px', boxSizing: 'border-box', flex: 'none' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(-1)} aria-label="Back to Settings" style={{
            width: '44px', height: '44px', flex: 'none', borderRadius: '50%', background: 'var(--light-blush)',
            border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Deets</h1>
        </div>
      </div>

      <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px 34px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Your stamp with your initials inside the neon yellow heart */}
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '240px', height: '144px', transform: 'translateX(59px) rotate(-4deg)' }} role="img" aria-label={`Your stamp with your initials, ${initialsOf(displayName || user?.username || '?')}`}>
            <img src="/brand/postmark_stamp_heartless.png" alt="" style={{ width: '240px', height: 'auto', display: 'block' }} />
            <img src={waxLetterSrc(displayName || user?.username || '?')} alt="" style={{
              position: 'absolute', left: `${240 * WAX_CENTER_X}px`, top: `${240 * WAX_CENTER_Y}px`,
              width: `${Math.round(240 * WAX_WIDTH)}px`, transform: 'translate(-50%, -50%)',
            }} />
            <button onClick={() => setPickingAvatar(true)} aria-label="Pick an emoji or add a photo" style={{
              position: 'absolute', left: '5px', top: '12px', width: '38px', height: '38px', borderRadius: '50%',
              border: '3px solid var(--stone)', background: 'var(--stamp-center)', color: 'var(--card)', padding: 0, boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        {/* Fields */}
        <div style={{ marginTop: '26px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '18px', overflow: 'hidden' }}>
          <label style={rowStyle}>
            <span style={labelStyle}>Name</span>
            <input value={displayName} onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }} maxLength={50} style={fieldStyle} />
          </label>
          <label style={rowStyle}>
            <span style={labelStyle}>Username</span>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '17px' }}>
              <span style={{ fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>@</span>
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
        <p style={{ margin: '10px 4px 0', fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.45, color: 'var(--ink)' }}>
          We'll send you a Qute Note when it rolls around.
        </p>

        {/* Bottom: status + save + delete */}
        <div style={{ marginTop: 'auto', paddingTop: '26px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {error && (
            <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--error)' }}>{error}</p>
          )}
          {saved && !error && (
            <p role="status" style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--stamp-center)' }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="M8 12.5l2.7 2.7L16 9.5" /></svg>
              Saved
            </p>
          )}
          <div className="qn-actions">
            <button
              onClick={save}
              disabled={saving || !displayName.trim()}
              className="qn-stamp qn-action"
              style={{ ['--qn-panel' as string]: 'var(--btn)' }}
            >
              {saving ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
            <button onClick={() => { setConfirmingDelete(true); setDeleteText(''); setDeleteError('') }} style={{
              minHeight: '44px', padding: '0 12px', border: 0, background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', textDecoration: 'underline',
              textTransform: 'none', letterSpacing: 0, fontWeight: 400,
            }}>
              Delete account
            </button>
          </div>
        </div>
      </div>

      {pickingAvatar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(74,36,36,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setPickingAvatar(false)}>
          <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 300, marginBottom: '14px' }}>Pick your emoji</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {STATUS_EMOJI.map((e) => (
                <button key={e} onClick={async () => {
                  await api.put('/users/me', { avatarUrl: `/emoji/${e}.png` })
                  refreshUser?.()
                  setPickingAvatar(false)
                }} style={{
                  width: '52px', height: '52px', borderRadius: '26px', cursor: 'pointer',
                  background: 'var(--card)', border: '1.5px solid var(--stone)',
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(74,36,36,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => !deleting && setConfirmingDelete(false)}>
          <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', textAlign: 'center', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 300, marginBottom: '10px' }}>Delete your account?</h2>
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
                borderRadius: '14px', border: '1.5px solid var(--stone)', background: 'var(--card)', outline: 'none',
                fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', textAlign: 'center',
              }}
            />
            {deleteError && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--error)', marginBottom: '12px' }}>{deleteError}</p>
            )}
            <button
              onClick={deleteAccount}
              disabled={deleting || deleteText.trim().toUpperCase() !== 'DELETE'}
              className="qn-stamp qn-action"
              style={{
                color: 'var(--error)', marginBottom: '10px',
                ['--qn-panel' as string]: 'var(--error-pale)',
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
