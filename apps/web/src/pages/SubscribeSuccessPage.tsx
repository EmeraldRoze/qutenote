import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import QEmoji from '../components/QEmoji'

export default function SubscribeSuccessPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  useEffect(() => {
    // Refresh user data so subscriptionStatus is up to date
    refreshUser?.()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '400px', padding: '40px 20px', textAlign: 'center' }}>

        <div style={{ marginBottom: '20px' }}><QEmoji name="envelope" size={60} /></div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 500, color: 'var(--ink)', marginBottom: '12px' }}>
          You're subscribed!
        </h1>

        <p style={{ fontSize: '15px', color: 'var(--ink-muted)', lineHeight: 1.7, marginBottom: '32px' }}>
          Welcome to QuteNote. You can now send 2 postcards every month to the people who matter most.
        </p>

        <button
          onClick={() => navigate('/send')}
          style={{
            width: '100%', padding: '16px 24px', fontSize: '16px', fontWeight: 500,
            borderRadius: '50px', border: 'none', cursor: 'pointer',
            background: 'var(--lavender)', color: '#fff',
            boxShadow: 'var(--shadow-button)', fontFamily: 'var(--font-body)',
            marginBottom: '12px', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--lavender-dark)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--lavender)'}
        >
          Send your first note
        </button>

        <button
          onClick={() => navigate('/home')}
          style={{
            width: '100%', padding: '14px 24px', fontSize: '14px', fontWeight: 500,
            borderRadius: '50px', border: '1.5px solid var(--lavender-light)', cursor: 'pointer',
            background: 'var(--white)', color: 'var(--lavender-dark)',
            fontFamily: 'var(--font-body)', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--lavender-pale)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--white)'}
        >
          Go to home
        </button>

      </div>
    </div>
  )
}
