import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'

interface InviteInfo {
  id: string
  recipientName: string
  status: string
  alreadyCompleted: boolean
  sender: { displayName: string; avatarUrl: string | null }
}

export default function CollectAddressPage() {
  const { token } = useParams<{ token: string }>()
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.get(`/invites/collect/${token}`)
      .then((res) => {
        setInvite(res.data.data)
        if (res.data.data.alreadyCompleted) setDone(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post(`/invites/collect/${token}`, { line1, line2: line2 || undefined, city, state, zip })
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px', fontSize: '15px',
    borderRadius: '12px', border: '1.5px solid var(--border-default)',
    background: 'var(--white)', color: 'var(--ink)',
    outline: 'none', fontFamily: 'var(--font-body)',
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink-muted)' }}>Loading...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--ink)', marginBottom: '8px' }}>
            Link not found
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)' }}>
            This invite link isn't valid or has expired.
          </p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '400px', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}><QEmoji name="envelope" size={52} /></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>
            You're all set!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Your address has been saved. {invite?.sender.displayName} can now send you a surprise in the mail!
          </p>
          <p style={{ fontSize: '13px', color: 'var(--lavender-dark)', marginTop: '20px', fontWeight: 500 }}>
            QuteNote — real cards, real smiles
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'var(--white)', borderBottom: '1px solid var(--lavender-pale)',
        padding: '16px 20px', textAlign: 'center',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: 'var(--lavender-deep)' }}>
          QuteNote
        </h1>
      </div>

      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Intro card */}
        <div style={{
          background: 'var(--white)', borderRadius: '20px',
          border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)',
          padding: '28px 24px', textAlign: 'center', marginBottom: '16px',
        }}>
          <div style={{ marginBottom: '12px' }}><QEmoji name="envelope" size={44} /></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>
            {invite?.sender.displayName} wants to send you something!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Share your mailing address below so they can send you a real, physical card in the mail. Your address will only be used for this purpose.
          </p>
        </div>

        {/* Address form */}
        <div style={{
          background: 'var(--white)', borderRadius: '20px',
          border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)',
          padding: '24px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '16px' }}>
            Your mailing address
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '4px', display: 'block' }}>
                Street address
              </label>
              <input
                type="text"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="123 Main St"
                required
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--lavender)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '4px', display: 'block' }}>
                Apt / Suite (optional)
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Apt 4B"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--lavender)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '4px', display: 'block' }}>
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Los Angeles"
                required
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--lavender)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '4px', display: 'block' }}>
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CA"
                  required
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--lavender)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '4px', display: 'block' }}>
                  Zip code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="90001"
                  required
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--lavender)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#C9868D', textAlign: 'center' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !line1.trim() || !city.trim() || !state.trim() || !zip.trim()}
              style={{
                padding: '16px 24px', fontSize: '15px', fontWeight: 500,
                borderRadius: '50px', border: 'none',
                cursor: submitting ? 'default' : 'pointer',
                background: submitting ? 'var(--lavender-pale)' : 'var(--lavender)',
                color: '#fff', fontFamily: 'var(--font-body)',
                marginTop: '4px', transition: 'background 0.15s',
              }}
            >
              {submitting ? 'Saving...' : 'Share my address'}
            </button>

            <p style={{ fontSize: '11px', color: 'var(--ink-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Your address is only shared with {invite?.sender.displayName} for sending you mail. We never share it with anyone else.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
