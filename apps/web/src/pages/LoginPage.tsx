import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { postSocialAuthRoute } from '../lib/postAuthRoute'
import { useAuth } from '../context/AuthContext'
import { isNativeApp } from '../lib/native'
import { appleSignIn, openGoogleSignIn } from '../lib/nativeAuth'
import QEmoji from '../components/QEmoji'

// Log in — screen 06 of the Oct 15 2026 redesign. Email-or-username +
// password with autofill-friendly attributes, then Apple/Google below.
// Log in only signs into an existing account; it never creates one — but if
// Apple/Google end up creating a brand-new account, we still route them to
// pick their handle.

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box',
}
const fieldStyle: React.CSSProperties = {
  border: 0, outline: 'none', background: 'transparent', padding: 0,
  fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%',
}
const fieldLabel: React.CSSProperties = { fontSize: '13px', color: 'var(--ink)' }
const roundBtn: React.CSSProperties = {
  width: '68px', height: '68px', borderRadius: '50%', border: '2px solid var(--outline)',
  background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      login(res.data.data.token, res.data.data.user)
      navigate('/home')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
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
            <button onClick={() => navigate('/welcome')} aria-label="Back" style={{
              width: '44px', height: '44px', borderRadius: '50%', background: 'var(--light-blush)',
              border: 'none', cursor: 'pointer', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{
              margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 300,
              fontSize: '26px', lineHeight: 1.12, letterSpacing: '-0.02em',
            }}>
              Welcome back, QT.
            </h1>
            <QEmoji name="heart-sparkle" size={90} style={{ flex: 'none', transform: 'rotate(8deg)' }} />
          </div>
        </div>
      </header>

      <div style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '34px' }}>
        <p style={{ margin: '18px 0 0', fontSize: '15px', lineHeight: 1.45, color: 'var(--ink)' }}>
          Slide into their mailbox.
        </p>

        {error && (
          <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', marginTop: '14px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ marginTop: '18px', background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px', overflow: 'hidden' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', borderBottom: '1.5px solid var(--outline)' }}>
              <span style={fieldLabel}>Email or username</span>
              <input
                placeholder="you@email.com" autoComplete="username" required style={fieldStyle}
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={fieldLabel}>Password</span>
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="Your password" autoComplete="current-password" required
                  style={fieldStyle}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <button type="button" onClick={() => setShowPassword((s) => !s)} style={{
                minHeight: '44px', border: 0, background: 'transparent', fontFamily: 'var(--font-body)',
                fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--stamp-center)', cursor: 'pointer',
              }}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          <Link to="/forgot-password" style={{
            alignSelf: 'flex-end', minHeight: '44px', display: 'flex', alignItems: 'center',
            fontSize: '15px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-body)', textDecoration: 'none',
          }}>
            Forgot password?
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="qn-stamp qn-action qn-action-square"
            style={{ marginTop: '10px', ['--qn-panel' as string]: loading ? 'var(--light-blush)' : 'var(--btn)' }}
          >
            {loading ? 'LOGGING IN…' : 'LOGIN'}
          </button>

          <div style={{ margin: '24px 0 18px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--ink)' }}>
            <span style={{ flex: 1, height: '1.5px', background: '#D9CFC2' }} />
            or log in with
            <span style={{ flex: 1, height: '1.5px', background: '#D9CFC2' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            {isNativeApp && (
              <button
                type="button"
                aria-label="Log in with Apple"
                onClick={async () => {
                  setError('')
                  try {
                    const data = await appleSignIn()
                    login(data.token, data.user)
                    const isNew = (data as any).isNew === true
                    const dest = await postSocialAuthRoute(isNew, data.user)
                    navigate(dest, isNew ? { state: { provider: 'Apple' } } : undefined)
                  } catch (err: any) {
                    const code = String(err?.code ?? '')
                    const message = String(err?.message ?? '')
                    const canceled = code === '1001' || /cancel/i.test(message)
                    if (canceled) return
                    setError(err?.response?.data?.error ?? `Apple sign-in didn't go through (${message || 'unknown error'}). Try again.`)
                  }
                }}
                style={{ ...roundBtn, color: 'var(--ink)', paddingBottom: '3px' }}
              >
                <svg width="24" height="28" viewBox="0 0 170 200" fill="currentColor"><path d="M150.4 69.2c-1.1.8-20.3 11.6-20.3 35.6 0 27.8 24.4 37.6 25.1 37.8-.1.6-3.9 13.4-12.9 26.5-8 11.5-16.4 23-29.1 23s-16-7.4-30.7-7.4c-14.3 0-19.4 7.6-31 7.6s-19.7-10.7-29-23.8C11.8 153.1 3 129.3 3 106.7c0-36.2 23.5-55.4 46.7-55.4 12.3 0 22.6 8.1 30.3 8.1 7.4 0 18.9-8.6 32.9-8.6 5.3 0 24.5.5 37.5 18.4zM106.3 35.5c5.8-6.9 9.9-16.5 9.9-26.1 0-1.3-.1-2.7-.4-3.8-9.4.4-20.7 6.3-27.4 14.1-5.3 6-10.3 15.6-10.3 25.3 0 1.5.2 2.9.3 3.4.6.1 1.6.2 2.6.2 8.5 0 19.1-5.7 25.3-13.1z" /></svg>
              </button>
            )}
            <a
              href="/api/auth/google"
              aria-label="Log in with Google"
              onClick={isNativeApp ? (e) => {
                e.preventDefault()
                setError('')
                openGoogleSignIn().catch((err: any) => {
                  setError(`Google sign-in didn't open (${err?.message ?? 'unknown error'}). Try again.`)
                })
              } : undefined}
              style={roundBtn}
            >
              <svg width="26" height="26" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" /><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.9-6.2z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" /></svg>
            </a>
          </div>

          {/* Right below the sign-in options — never below the fold (a tester
              logged out and thought there was no way to make a new account) */}
          <p style={{ margin: '18px 0 0', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '15px', color: 'var(--ink)' }}>
            New here?{' '}
            <Link to="/signup" style={{ fontWeight: 700, color: 'var(--stamp-center)', textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
