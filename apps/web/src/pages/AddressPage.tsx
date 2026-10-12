import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface AddressData {
  line1: string
  line2: string
  city: string
  state: string
  zip: string
  country: string
}

export default function AddressPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<AddressData>({ line1: '', line2: '', city: '', state: '', zip: '', country: 'US' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/address/me').then((res) => {
      if (res.data.data) {
        const a = res.data.data
        setForm({ line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, zip: a.zip, country: a.country })
        setIsVerified(!!a.isVerified)
      }
    }).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      const res = await api.post('/address', form)
      setIsVerified(!!res.data.data?.isVerified)
      setSaved(true)
      setTimeout(() => navigate('/home'), 1200)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = {
    width: '100%', border: 'none', outline: 'none', background: 'transparent',
    fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)', padding: 0,
  }

  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    color: 'var(--ink-mid)', marginBottom: '4px',
  }

  const rowDivider = { padding: '12px 18px', borderBottom: '1px solid var(--stone)' }

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
          My Address
        </h1>
        <div style={{ width: '36px' }} />
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px 32px' }}>

        {/* Explanation */}
        <div style={{
          background: 'var(--lavender-pale)', borderRadius: '16px',
          border: '1px solid var(--lavender-light)', padding: '16px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lavender-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '3px' }}>
            <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <p style={{ fontSize: '14px', color: 'var(--lavender-deep)', lineHeight: 1.6 }}>
            Your QTs never see this. We only use it to print and mail the cards they send you.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '14px', padding: '40px 0' }}>Loading...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: 'var(--error-pale)', border: '1px solid rgba(224,78,107,0.3)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {saved && (
              <div style={{ background: '#EBF2E9', border: '1px solid #B5C9B0', color: '#6B9265', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' }}>
                Address saved!
              </div>
            )}

            <div style={{
              background: '#fff', borderRadius: '18px', boxShadow: 'var(--shadow-card)', overflow: 'hidden',
            }}>
              <div style={rowDivider}>
                <label style={labelStyle}>Street address</label>
                <input type="text" placeholder="123 Main St" value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })} required style={fieldStyle} />
              </div>

              <div style={rowDivider}>
                <label style={labelStyle}>Apt, suite, etc. <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" placeholder="Apt 4B" value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })} style={fieldStyle} />
              </div>

              <div style={rowDivider}>
                <label style={labelStyle}>City</label>
                <input type="text" placeholder="Santa Fe" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} required style={fieldStyle} />
              </div>

              <div style={{ ...rowDivider, borderBottom: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>State</label>
                  <input type="text" placeholder="NM" value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })} required style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>ZIP code</label>
                  <input type="text" placeholder="87501" value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })} required style={fieldStyle} />
                </div>
              </div>
            </div>

            {isVerified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 4px 0' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink)',
                  background: 'var(--lime)', padding: '4px 10px', borderRadius: '10px',
                }}>✓ Verified</span>
                <span style={{ fontSize: '13px', color: 'var(--ink-mid)' }}>Ready for mail</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%', marginTop: '20px', padding: '14px 24px', fontSize: '13px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                borderRadius: '50px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'var(--lavender-light)' : 'var(--lavender)',
                color: '#fff', boxShadow: saving ? 'none' : 'var(--shadow-button)',
                fontFamily: 'var(--font-body)', transition: 'background 0.15s',
              }}
            >
              {saving ? 'Saving...' : 'Save address'}
            </button>

            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', textAlign: 'center', marginTop: '12px' }}>
              US addresses only for now. More countries coming soon.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
