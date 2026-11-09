import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'
import QIcon from '../components/QIcon'
import AddressAutocomplete from '../components/AddressAutocomplete'

// Your address ("Where you at?"), palette 4 restyle of screen 18-your-address.html.
// No tab bar. Serves both /address and /settings/address. Save goes through the
// existing Lob AVS verification on POST /address.

interface AddressData {
  line1: string
  line2: string
  city: string
  state: string
  zip: string
  country: string
}

const fieldStyle: React.CSSProperties = {
  border: 0, outline: 'none', background: 'transparent', padding: 0,
  fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--ink)', width: '100%',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)',
}
const rowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px',
  borderBottom: '1.5px solid var(--stone)',
}

export default function AddressPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<AddressData>({ line1: '', line2: '', city: '', state: '', zip: '', country: 'US' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState('')
  // Three states now, not a yes/no (Nov 9): GOOD, BAD, UNCHECKED. A BAD one
  // blocks cards being sent here, so this screen has to say WHY and offer the
  // post office's own spelling of what it thinks was meant — otherwise the
  // person is just stuck guessing at their own address.
  const [verifyStatus, setVerifyStatus] = useState<'GOOD' | 'BAD' | 'UNCHECKED' | null>(null)
  const [verifyReason, setVerifyReason] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<AddressData | null>(null)

  useEffect(() => {
    api.get('/address/me').then((res) => {
      if (res.data.data) {
        const a = res.data.data
        setForm({ line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, zip: a.zip, country: a.country })
        setIsVerified(!!a.isVerified)
        setVerifyStatus(a.verifyStatus ?? null)
        setVerifyReason(a.verifyReason ?? null)
      }
    }).finally(() => setLoading(false))
  }, [])

  async function save(body: AddressData) {
    setError('')
    setSaving(true)
    setSaved(false)
    setSuggestion(null)
    try {
      const res = await api.post('/address', body)
      const d = res.data.data
      setIsVerified(!!d?.isVerified)
      setVerifyStatus(d?.verifyStatus ?? null)
      setVerifyReason(d?.verifyReason ?? null)
      if (d?.suggestion) setSuggestion({ ...d.suggestion, line2: d.suggestion.line2 ?? '', country: 'US' })
      setSaved(true)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save(form)
  }

  // One tap: take the post office's spelling and re-check it straight away.
  async function acceptSuggestion() {
    if (!suggestion) return
    setForm(suggestion)
    await save(suggestion)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Title band */}
      <div className="title-band" style={{ height: '144px', boxSizing: 'border-box', flex: 'none' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(-1)} aria-label="Back" style={{
            width: '44px', height: '44px', flex: 'none', borderRadius: '50%', background: 'var(--light-blush)',
            border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QIcon name="chevron-left" size={18} />
          </button>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Where you at?</h1>
        </div>
      </div>

      <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px 34px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Privacy note */}
        <div style={{ marginTop: '24px', background: 'var(--light-blush)', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <QEmoji name="lock" size={34} style={{ flex: 'none', height: 'auto', marginTop: '1px' }} />
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: '18px', color: 'var(--ink)' }}>
            Your address is private. It stays between us and the post office.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', fontSize: '14px', padding: '40px 0' }}>Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

            {error && (
              <div style={{ marginTop: '16px', background: 'var(--error-pale)', border: '1.5px solid var(--error)', color: 'var(--error)', borderRadius: '14px', padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                {error}
              </div>
            )}
            {saved && verifyStatus !== 'BAD' && (
              <div style={{ marginTop: '16px', background: 'var(--lime-tint)', border: '1.5px solid var(--lime-border)', color: 'var(--ink)', borderRadius: '14px', padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                Address saved!
              </div>
            )}

            {/* The post office says this one cannot be delivered to. Cards
                sent here are held until it is fixed, so say why, and offer
                the corrected spelling as a single tap. */}
            {verifyStatus === 'BAD' && (
              <div style={{ marginTop: '16px', background: 'var(--error-pale)', border: '1.5px solid var(--error)', borderRadius: '14px', padding: '14px 16px', fontFamily: 'var(--font-body)' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--error)' }}>
                  The post office can't deliver here yet.
                </p>
                {verifyReason && (
                  <p style={{ margin: '6px 0 0', fontSize: '14px', lineHeight: '19px', color: 'var(--ink)' }}>{verifyReason}</p>
                )}
                <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: '18px', color: 'var(--ink-muted)' }}>
                  It's saved either way, but cards can't be mailed here until it checks out.
                </p>
                {suggestion && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--error)' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-muted)' }}>Did you mean</p>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', lineHeight: '19px', fontWeight: 700, color: 'var(--ink)' }}>
                      {suggestion.line1}{suggestion.line2 ? `, ${suggestion.line2}` : ''}<br />
                      {suggestion.city}, {suggestion.state} {suggestion.zip}
                    </p>
                    <button type="button" onClick={acceptSuggestion} disabled={saving} style={{
                      marginTop: '10px', border: 'none', cursor: 'pointer', borderRadius: '20px',
                      background: 'var(--btn)', color: 'var(--ink)', padding: '9px 18px',
                      fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700,
                    }}>
                      Use this instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* We could not reach the checker. Never pretend that means the
                address is wrong — cards still go. */}
            {saved && verifyStatus === 'UNCHECKED' && (
              <p style={{ margin: '10px 4px 0', fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: '18px', color: 'var(--ink-muted)' }}>
                We couldn't double-check it with the post office just now. Your cards will still go out.
              </p>
            )}

            {/* Fields */}
            <div style={{ marginTop: '20px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '18px', overflow: 'hidden' }}>
              <label style={rowStyle}>
                <span style={labelStyle}>Street address</span>
                <AddressAutocomplete
                  value={form.line1}
                  onChange={(v: string) => setForm({ ...form, line1: v })}
                  onPick={(a) => setForm({ ...form, line1: a.line1, city: a.city, state: a.state, zip: a.zip })}
                  required style={fieldStyle}
                />
              </label>
              <label style={rowStyle}>
                <span style={labelStyle}>Apt, suite, etc. (optional)</span>
                <input value={form.line2} placeholder="Apt 4B" onChange={(e) => setForm({ ...form, line2: e.target.value })} name="address-line2" autoComplete="address-line2" style={fieldStyle} />
              </label>
              <label style={rowStyle}>
                <span style={labelStyle}>City</span>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required name="city" autoComplete="address-level2" style={fieldStyle} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <label style={{ ...rowStyle, borderBottom: 'none', borderRight: '1.5px solid var(--stone)' }}>
                  <span style={labelStyle}>State</span>
                  <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required name="state" autoComplete="address-level1" style={fieldStyle} />
                </label>
                <label style={{ ...rowStyle, borderBottom: 'none' }}>
                  <span style={labelStyle}>ZIP code</span>
                  <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} required inputMode="numeric" name="zip" autoComplete="postal-code" style={fieldStyle} />
                </label>
              </div>
            </div>

            {/* Verified tag */}
            {isVerified && (
              <p style={{ margin: '12px 4px 0', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--highlight)', borderRadius: '10px', padding: '3px 10px' }}>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  Verified
                </span>
                <span style={{ fontWeight: 400, color: 'var(--ink)' }}>Ready for mail</span>
              </p>
            )}

            {/* Save */}
            <div style={{ marginTop: 'auto', paddingTop: '26px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  height: '56px', borderRadius: '28px', background: 'var(--btn)', color: 'var(--ink)', boxSizing: 'border-box',
                  fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em',
                  cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'SAVING…' : 'SAVE ADDRESS'}
              </button>
              <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>
                US addresses only for now. <br />More countries coming soon.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
