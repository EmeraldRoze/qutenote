import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { trackFunnel } from '../../lib/analytics'
import QEmoji from '../../components/QEmoji'
import QIcon from '../../components/QIcon'

// Step 3 of 3: get paid with PayPal (her qutenote-artists package, screen 05).
// Emerald, Oct 26: no PayPal API yet — we keep the address and she pays by
// hand, so this screen only has to collect an email it can trust.

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box',
}

export default function ArtistPayoutsPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/artists/me').then((r) => {
      const p = r.data.data
      if (!p) { navigate('/artist/apply', { replace: true }); return }
      if (p.paypalEmail) { setEmail(p.paypalEmail); setSaved(true) }
    }).catch(() => {})
  }, [navigate])

  async function connect() {
    setError('')
    setSaving(true)
    try {
      await api.put('/artists/me/paypal', { paypalEmail: email.trim() })
      trackFunnel('artist', 'paypal-connected')
      setSaved(true)
      navigate(`/profile/${(await api.get('/auth/me')).data.data.username}`)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "That didn't save. Try again.")
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="title-band" style={{ height: '216px', boxSizing: 'border-box', paddingTop: 'max(calc(40px - env(safe-area-inset-top)), 0px)' }}>
        <div style={col}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => navigate(-1)} aria-label="Back" style={{
              width: '44px', height: '44px', flex: 'none', borderRadius: '50%', background: 'var(--light-blush)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <QIcon name="chevron-left" size={18} />
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}>Step 3 of 3</span>
              <div aria-hidden style={{ display: 'flex', gap: '4px' }}>
                {[0, 1, 2].map((i) => <span key={i} style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--highlight)' }} />)}
              </div>
            </div>
            <span style={{ width: '44px' }} />
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', lineHeight: '36px', letterSpacing: '-0.01em' }}>
              Get paid with PayPal.
            </h1>
            <QEmoji name="money-wings" size={66} style={{ flex: 'none', height: 'auto', transform: 'rotate(-5deg)' }} />
          </div>
        </div>
      </header>

      <div style={{ ...col, marginTop: '16px' }}>
        <p className="on-paper" style={{ margin: '0 0 16px', fontSize: '15px', lineHeight: '18px', fontFamily: 'var(--font-body)' }}>
          You earn money every time someone sends one of your cards. We pay you through PayPal.
        </p>

        {error && (
          <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--ink)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
            {error}
          </div>
        )}

        <label style={{
          display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px',
          background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px', boxShadow: 'var(--shadow-card)',
        }}>
          <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}>PayPal email</span>
          <input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSaved(false) }}
            placeholder="you@email.com"
            type="email"
            autoCapitalize="none"
            style={{ border: 0, outline: 'none', background: 'transparent', padding: 0, fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%' }}
          />
        </label>

        <button
          onClick={connect}
          disabled={saving}
          style={{
            marginTop: '22px', width: '100%', height: '56px', borderRadius: '28px', background: 'var(--btn)',
            border: '2px solid var(--outline)', boxSizing: 'border-box', cursor: saving ? 'default' : 'pointer',
            color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700,
            letterSpacing: '0.08em', textIndent: '0.08em', boxShadow: 'var(--shadow-button)', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'SAVING…' : saved ? 'SAVED' : 'CONNECT PAYPAL'}
        </button>

        <p className="on-paper" style={{ margin: '12px 0 0', textAlign: 'center', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
          You can change this anytime in Settings.
        </p>
      </div>
    </div>
  )
}
