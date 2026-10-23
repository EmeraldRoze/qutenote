import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
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
          {sent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}><QEmoji name="envelope" size={44} /></div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: 'var(--ink)', marginBottom: '12px', textAlign: 'center' }}>
                Check your email
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--ink-mid)', lineHeight: 1.6, textAlign: 'center', marginBottom: '24px' }}>
                If that email is in our system, we sent you a link to reset your password. It expires in 1 hour.
              </p>
              <Link
                to="/login"
                style={{
                  display: 'block', textAlign: 'center', fontSize: '14px',
                  color: 'var(--ink)', fontWeight: 700,
                }}
              >
                Back to login
              </Link>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: 'var(--ink)', marginBottom: '8px' }}>
                Forgot your password?
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--ink-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
                Enter your email and we'll send you a link to reset it.
              </p>

              {error && (
                <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Email</label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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
                  {loading ? 'SENDING...' : 'SEND RESET LINK'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--ink-mid)', marginTop: '24px' }}>
                <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 700 }}>
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
