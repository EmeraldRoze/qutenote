import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import QEmoji from '../../components/QEmoji'
import Logo from '../../components/Logo'

// Pick your handle — screen 03 of the Oct 15 2026 redesign. Shown only after
// Apple or Google just created a NEW account (they don't give us a username).
// Pre-fills the auto-generated handle, checks availability live, and offers
// three free alternatives as tappable chips.

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box',
}

export default function PickHandlePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()

  const [handle, setHandle] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const seeded = useRef(false)

  // Pre-fill with the handle the server suggested from their display name
  useEffect(() => {
    if (user && !seeded.current) {
      seeded.current = true
      setHandle(user.username)
    }
  }, [user])

  // Live availability check (debounced)
  useEffect(() => {
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) { setStatus('idle'); return }
    setStatus('checking')
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/users/handle-check?u=${encodeURIComponent(handle)}`)
        setStatus(res.data.data.available ? 'available' : 'taken')
        if (res.data.data.suggestions?.length) setSuggestions(res.data.data.suggestions)
      } catch {
        setStatus('idle')
      }
    }, 300)
    return () => clearTimeout(t)
  }, [handle])

  async function save() {
    setError('')
    setSaving(true)
    try {
      await api.put('/users/me', { username: handle })
      refreshUser()
      navigate('/signup/address')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
      {/* Title band — 216px, a multiple of 36 so the ruling keeps its rhythm */}
      <header className="title-band" style={{
        height: '216px', boxSizing: 'border-box', flex: 'none',
        paddingTop: 'max(calc(54px - env(safe-area-inset-top)), 0px)',
      }}>
        <div style={col}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => navigate(-1)} aria-label="Back" style={{
              width: '44px', height: '44px', borderRadius: '50%', background: 'var(--light-blush)',
              border: 'none', cursor: 'pointer', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <Logo height={26} />
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{
              margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 300,
              fontSize: '26px', lineHeight: 1.12, letterSpacing: '-0.02em',
            }}>
              Pick your handle.
            </h1>
            <QEmoji name="bff" size={56} style={{ flex: 'none', transform: 'rotate(4deg)' }} />
          </div>
        </div>
      </header>

      <div style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '34px' }}>
        <p style={{ margin: '18px 0 0', fontSize: '15px', lineHeight: 1.45, color: 'var(--ink)' }}>
          Choose the name your QTs will search for.
        </p>

        <div style={{
          marginTop: '18px', background: 'var(--card)', border: '2px solid var(--outline)', borderRadius: '18px',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>Username</span>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '16px' }}>
              <span style={{ color: 'var(--stamp-center)', fontWeight: 700 }}>@</span>
              <input
                value={handle}
                autoComplete="username"
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                style={{
                  border: 0, outline: 'none', background: 'transparent', padding: 0,
                  fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%',
                }}
              />
            </span>
          </label>
          {status === 'available' && (
            <span style={{
              flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink)',
              background: '#EEFC4E', borderRadius: '10px', padding: '4px 10px', fontSize: '13px', fontWeight: 700,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              Available
            </span>
          )}
          {status === 'taken' && (
            <span style={{
              flex: 'none', display: 'inline-flex', alignItems: 'center',
              background: 'var(--error-pale)', color: 'var(--error)', borderRadius: '10px', padding: '4px 10px', fontSize: '13px', fontWeight: 700,
            }}>
              Taken
            </span>
          )}
        </div>
        <p style={{ margin: '10px 4px 0', fontSize: '13px', color: 'var(--ink)' }}><br /></p>

        {error && (
          <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', marginTop: '14px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <h2 style={{ margin: '22px 0 10px', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
          Or try one of these
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {suggestions.map((s) => (
            <button key={s} onClick={() => setHandle(s)} style={{
              flex: 'none', minHeight: '40px', padding: '0 14px', borderRadius: '20px',
              border: '1.5px solid var(--outline)', background: 'var(--card)', fontFamily: 'var(--font-body)',
              fontSize: '14px', color: 'var(--ink)', cursor: 'pointer', fontWeight: 400,
              textTransform: 'none', letterSpacing: 0,
            }}>
              @{s}
            </button>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving || status === 'taken' || !/^[a-z0-9_]{3,20}$/.test(handle)}
          style={{
            marginTop: 'auto', height: '56px', borderRadius: '28px', border: '2px solid #B4897A', boxSizing: 'border-box',
            cursor: saving ? 'not-allowed' : 'pointer',
            background: saving ? 'var(--light-blush)' : 'var(--btn)', color: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em',
            opacity: status === 'taken' || !/^[a-z0-9_]{3,20}$/.test(handle) ? 0.5 : 1,
          }}
        >
          {saving ? 'SAVING…' : 'CONTINUE'}
        </button>
      </div>
    </div>
  )
}
