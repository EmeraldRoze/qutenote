import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function SubscribePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubscribe() {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/stripe/checkout')
      window.location.href = res.data.data.url
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
      setLoading(false)
    }
  }

  async function handleManageBilling() {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/stripe/portal')
      window.location.href = res.data.data.url
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const isActive = user?.subscriptionStatus === 'ACTIVE'
  const isPastDue = user?.subscriptionStatus === 'PAST_DUE'

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        background: 'var(--white)', borderBottom: '1px solid var(--lavender-pale)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{
          width: '36px', height: '36px', borderRadius: '50%', background: 'var(--lavender-pale)',
          border: 'none', cursor: 'pointer', color: 'var(--lavender-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, color: 'var(--ink)' }}>
          Subscribe
        </h1>
        <div style={{ width: '60px' }} />
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>
            Send Qute Notes
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Real physical postcards, mailed to the people you love.
          </p>
        </div>

        {/* Pricing card */}
        <div style={{
          background: 'var(--white)', borderRadius: '24px',
          border: '1.5px solid var(--lavender-light)', boxShadow: 'var(--shadow-card)',
          padding: '32px 28px', marginBottom: '16px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--lavender-dark)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Qute Starter
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 600, color: 'var(--ink)' }}>$7.95</span>
            <span style={{ fontSize: '14px', color: 'var(--ink-muted)' }}>/month</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '28px' }}>
            Cancel anytime
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px', textAlign: 'left' }}>
            {[
              '2 physical postcards per month',
              'Thoughtful prompts to help you express your feels',
              'Your QTs can send to you too',
              'Add in your own personal handwriting',
            ].map(feature => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--lavender)', fontSize: '16px', flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: '14px', color: 'var(--ink)' }}>{feature}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: 'var(--error-pale)', border: '1px solid rgba(224,78,107,0.3)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {isPastDue && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FCD9A0', color: '#92600A', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' }}>
              Your last payment didn't go through. Update your payment method to keep sending notes.
            </div>
          )}

          {isActive || isPastDue ? (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              style={{
                width: '100%', padding: '14px 24px', fontSize: '15px', fontWeight: 500,
                borderRadius: '50px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'var(--lavender-light)' : 'var(--lavender)',
                color: '#fff', boxShadow: loading ? 'none' : 'var(--shadow-button)',
                fontFamily: 'var(--font-body)', transition: 'background 0.15s',
              }}
            >
              {loading ? 'Loading...' : 'Manage billing'}
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              style={{
                width: '100%', padding: '14px 24px', fontSize: '15px', fontWeight: 500,
                borderRadius: '50px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'var(--lavender-light)' : 'var(--lavender)',
                color: '#fff', boxShadow: loading ? 'none' : 'var(--shadow-button)',
                fontFamily: 'var(--font-body)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--lavender-dark)' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--lavender)' }}
            >
              {loading ? 'Loading...' : 'Subscribe — $7.95/mo'}
            </button>
          )}
        </div>

        {/* Free tier note */}
        <div style={{
          background: 'var(--lavender-pale)', borderRadius: '16px',
          border: '1px solid var(--lavender-light)', padding: '16px 20px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--lavender-deep)', lineHeight: 1.6 }}>
            <strong>Free accounts</strong> can add their address, connect with QTs, and receive notes. A subscription is only needed to send physical postcards.
          </p>
        </div>

      </div>
    </div>
  )
}
