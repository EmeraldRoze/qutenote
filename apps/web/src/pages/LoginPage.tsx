import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { isNativeApp } from '../lib/native'
import { appleSignIn, openGoogleSignIn } from '../lib/nativeAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/site/logo-ink.png" alt="QuteNote" style={{ width: '260px', maxWidth: '80%', margin: '0 auto', display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-handwriting)', fontSize: '13px', color: 'var(--lavender)', marginTop: '6px' }}>
            Send something real.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--white)',
          borderRadius: '28px',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
          padding: '36px 32px',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--ink)', marginBottom: '24px' }}>
            Welcome back
          </h2>

          {isNativeApp && (
            <button
              onClick={async () => {
                setError('')
                try {
                  const { token, user } = await appleSignIn()
                  login(token, user)
                  navigate('/home')
                } catch (err: any) {
                  const code = String(err?.code ?? '')
                  const message = String(err?.message ?? '')
                  const canceled = code === '1001' || /cancel/i.test(message)
                  if (canceled) return
                  setError(err?.response?.data?.error ?? `Apple sign-in didn't go through (${message || 'unknown error'}). Try again.`)
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                width: '100%', padding: '11px 24px', fontSize: '14px', fontWeight: 500,
                borderRadius: '50px', border: 'none',
                background: '#000', color: '#fff',
                fontFamily: 'var(--font-body)', cursor: 'pointer', marginBottom: '12px',
              }}
            >
              <svg width="16" height="18" viewBox="0 0 170 200" fill="#fff"><path d="M150.4 69.2c-1.1.8-20.3 11.6-20.3 35.6 0 27.8 24.4 37.6 25.1 37.8-.1.6-3.9 13.4-12.9 26.5-8 11.5-16.4 23-29.1 23s-16-7.4-30.7-7.4c-14.3 0-19.4 7.6-31 7.6s-19.7-10.7-29-23.8C11.8 153.1 3 129.3 3 106.7c0-36.2 23.5-55.4 46.7-55.4 12.3 0 22.6 8.1 30.3 8.1 7.4 0 18.9-8.6 32.9-8.6 5.3 0 24.5.5 37.5 18.4zM106.3 35.5c5.8-6.9 9.9-16.5 9.9-26.1 0-1.3-.1-2.7-.4-3.8-9.4.4-20.7 6.3-27.4 14.1-5.3 6-10.3 15.6-10.3 25.3 0 1.5.2 2.9.3 3.4.6.1 1.6.2 2.6.2 8.5 0 19.1-5.7 25.3-13.1z"/></svg>
              Sign in with Apple
            </button>
          )}

          <a
            href="/api/auth/google"
            onClick={isNativeApp ? (e) => {
              e.preventDefault()
              setError('')
              openGoogleSignIn().catch((err: any) => {
                setError(`Google sign-in didn't open (${err?.message ?? 'unknown error'}). Try again.`)
              })
            } : undefined}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              width: '100%', padding: '11px 24px', fontSize: '14px', fontWeight: 500,
              borderRadius: '50px', border: '1.5px solid var(--border-default)',
              background: 'var(--white)', color: 'var(--ink)',
              fontFamily: 'var(--font-body)', textDecoration: 'none',
              cursor: 'pointer', transition: 'background 0.15s', marginBottom: '20px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Sign in with Google
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
          </div>

          {error && (
            <div style={{ background: 'var(--error-pale)', border: '1px solid rgba(224,78,107,0.3)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={{
                  width: '100%', padding: '11px 16px', fontSize: '14px',
                  borderRadius: '10px', border: '1.5px solid var(--border-default)',
                  background: 'var(--white)', color: 'var(--ink)',
                  outline: 'none', fontFamily: 'var(--font-body)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--lavender)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={{
                  width: '100%', padding: '11px 16px', fontSize: '14px',
                  borderRadius: '10px', border: '1.5px solid var(--border-default)',
                  background: 'var(--white)', color: 'var(--ink)',
                  outline: 'none', fontFamily: 'var(--font-body)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--lavender)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password" style={{ fontSize: '13px', color: 'var(--lavender-dark)', fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px 24px', fontSize: '15px', fontWeight: 500,
                borderRadius: '50px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'var(--lavender-light)' : 'var(--lavender)',
                color: '#fff', boxShadow: loading ? 'none' : 'var(--shadow-button)',
                fontFamily: 'var(--font-body)', marginTop: '4px',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--ink-muted)', marginTop: '24px' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--lavender-dark)', fontWeight: 500 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
