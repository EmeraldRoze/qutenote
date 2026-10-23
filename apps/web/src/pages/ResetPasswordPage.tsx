import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--cream)' }}>
        <div className="w-full max-w-md text-center">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--ink)', marginBottom: '12px' }}>
            Invalid reset link
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-mid)', marginBottom: '24px' }}>
            This link is missing or broken. Try requesting a new one.
          </p>
          <Link to="/forgot-password" style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '14px' }}>
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="/brand/qutenote_logo.png" alt="QuteNote" style={{ height: '32px', width: 'auto' }} />
        </div>

        <div style={{
          background: 'var(--card)',
          borderRadius: '28px',
          border: '1.5px solid var(--outline)',
          boxShadow: 'var(--shadow-card)',
          padding: '36px 32px',
        }}>
          {done ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}><QEmoji name="popper" size={44} /></div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: 'var(--ink)', marginBottom: '12px', textAlign: 'center' }}>
                Password updated!
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--ink-mid)', lineHeight: 1.6, textAlign: 'center', marginBottom: '24px' }}>
                You're all set. Log in with your new password.
              </p>
              <Link
                to="/login"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '56px',
                  fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em', boxSizing: 'border-box',
                  borderRadius: '28px', border: '2px solid #B4897A', cursor: 'pointer', textAlign: 'center',
                  background: 'var(--btn)', color: 'var(--ink)', boxShadow: 'var(--shadow-button)',
                  fontFamily: 'var(--font-body)', textDecoration: 'none',
                }}
              >
                LOG IN
              </Link>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: 'var(--ink)', marginBottom: '8px' }}>
                Set a new password
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--ink-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
                Choose something you'll remember (at least 8 characters).
              </p>

              {error && (
                <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{
                      width: '100%', padding: '11px 16px', fontSize: '16px',
                      borderRadius: '10px', border: '1.5px solid #B4897A',
                      background: 'var(--card)', color: 'var(--ink)',
                      outline: 'none', fontFamily: 'var(--font-body)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--ink)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                    onBlur={e => { e.target.style.borderColor = '#B4897A'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    style={{
                      width: '100%', padding: '11px 16px', fontSize: '16px',
                      borderRadius: '10px', border: '1.5px solid #B4897A',
                      background: 'var(--card)', color: 'var(--ink)',
                      outline: 'none', fontFamily: 'var(--font-body)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--ink)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                    onBlur={e => { e.target.style.borderColor = '#B4897A'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', height: '56px', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em',
                    borderRadius: '28px', border: '2px solid #B4897A', boxSizing: 'border-box',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: loading ? 'var(--light-blush)' : 'var(--btn)',
                    color: 'var(--ink)', boxShadow: loading ? 'none' : 'var(--shadow-button)',
                    fontFamily: 'var(--font-body)', marginTop: '4px',
                    transition: 'background 0.15s',
                  }}
                >
                  {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
