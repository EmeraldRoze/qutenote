import { useEffect, useState } from 'react'
import { trackFunnel } from '../../lib/analytics'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import QEmoji from '../../components/QEmoji'

// Sign-up: address — screen 04 of the Oct 15 2026 redesign. Same endpoints as
// the settings AddressPage (POST /address runs Lob verification server-side),
// restyled for the onboarding flow. On save → /signup/birthday.
// The design shows no skip path, so there isn't one.

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 24px', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: '13px', color: 'var(--ink)' }
const inputStyle: React.CSSProperties = {
  height: '56px', boxSizing: 'border-box', borderRadius: '14px', border: '1.5px solid #B4897A',
  padding: '0 16px', fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)',
  background: 'var(--card)', outline: 'none', width: '100%',
}

export default function SignupAddressPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ line1: '', line2: '', city: '', state: '', zip: '', country: 'US' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // If they already saved one (e.g. backed up mid-signup), pick up where they left off
  useEffect(() => {
    api.get('/address/me').then((res) => {
      if (res.data.data) {
        const a = res.data.data
        setForm({ line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, zip: a.zip, country: a.country })
      }
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/address', form)
      trackFunnel('setup', 'address-saved')
      navigate('/signup/birthday')
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
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{
              margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: '26px', lineHeight: 1.12, letterSpacing: '-0.02em',
            }}>
              Where do <br />they go?
            </h1>
            <QEmoji name="house" size={64} style={{ flex: 'none' }} />
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '40px' }}>
        <div style={{
          marginTop: '18px', background: 'var(--light-blue)', border: '1.5px solid var(--outline)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', gap: '12px', alignItems: 'flex-start',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9E625F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: '1px' }}>
            <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.45 }}>
            Your address is private. It stays between us and the post office.{' '}
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', marginTop: '14px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="street" style={labelStyle}>Street address</label>
          <input
            id="street" name="address-line1" autoComplete="address-line1" required style={inputStyle}
            value={form.line1}
            onChange={(e) => setForm({ ...form, line1: e.target.value })}
          />
        </div>

        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="apt" style={labelStyle}>Apt or unit (optional)</label>
          <input
            id="apt" placeholder="Apt 204" name="address-line2" autoComplete="address-line2" style={inputStyle}
            value={form.line2}
            onChange={(e) => setForm({ ...form, line2: e.target.value })}
          />
        </div>

        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="city" style={labelStyle}>City</label>
          <input
            id="city" name="city" autoComplete="address-level2" required style={inputStyle}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="state" style={labelStyle}>State</label>
            <input
              id="state" name="state" autoComplete="address-level1" required style={inputStyle}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="zip" style={labelStyle}>ZIP code</label>
            <input
              id="zip" name="zip" autoComplete="postal-code" required style={inputStyle}
              value={form.zip}
              onChange={(e) => setForm({ ...form, zip: e.target.value })}
            />
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '24px' }} />
        <button
          type="submit"
          disabled={saving}
          style={{
            height: '56px', borderRadius: '28px', border: '2px solid #B4897A', boxSizing: 'border-box', flex: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            background: saving ? 'var(--light-blush)' : 'var(--btn)', color: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em',
          }}
        >
          {saving ? 'VERIFYING…' : 'VERIFY ADDRESS'}
        </button>
      </form>
    </div>
  )
}
