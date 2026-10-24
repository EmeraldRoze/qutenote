import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import QEmoji from '../components/QEmoji'
import { inviteByText } from '../lib/inviteText'

// "Invite friends" — App Screens board layout in the Oct 2026 system

interface Invite { id: string; recipientName: string; status: string; completedAt: string | null }

export default function InvitePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [invites, setInvites] = useState<Invite[]>([])
  const [composing, setComposing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sentName, setSentName] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/invites').then((r) => setInvites(r.data.data)).catch(() => {})
  }, [])

  const joined = invites.filter((i) => i.status === 'COMPLETED').length

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('That needs to be a 10-digit phone number.')
      return
    }
    setLoading(true)
    try {
      await api.post('/invites', { name, phone: digits })
      setSentName(name)
      setName('')
      setPhone('')
      setComposing(false)
      api.get('/invites').then((r) => setInvites(r.data.data)).catch(() => {})
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'That did not go through. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '14px 24px 0' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{
          width: '44px', height: '44px', border: 'none', background: 'transparent',
          color: 'var(--ink)', cursor: 'pointer', fontSize: '18px', textAlign: 'left',
        }}>←</button>

        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '14px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <QEmoji name="gift" size={86} style={{ transform: 'rotate(-8deg)' }} />
            <QEmoji name="envelope" size={86} style={{ transform: 'rotate(8deg)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', lineHeight: 1.18, color: 'var(--ink)', margin: '14px 0 0', letterSpacing: '-0.01em' }}>
            Every 10 friends who join = a free card.
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.45, color: 'var(--ink-mid)', margin: '8px 0 18px' }}>
            They each get one too. No catch.
          </p>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--card)', border: '1.5px solid var(--stone)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px' }}>{joined}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>friends joined</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--card)', border: '1.5px solid var(--stone)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px' }}>{Math.floor(joined / 10)}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>free cards earned</div>
            </div>
          </div>
        </div>

        {sentName && !composing && (
          <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '12px', background: 'var(--lavender-pale)', border: '1px solid var(--lavender-light)', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>
            Text sent. {sentName} gets a link to drop in their address, then your card can fly.
          </div>
        )}

        {/* Message preview + actions */}
        <div style={{ marginTop: '22px', borderRadius: '22px', background: 'var(--card)', border: '1.5px solid var(--stone)', boxShadow: '0 -4px 24px rgba(74,36,36,0.08), 0 4px 18px rgba(74,36,36,0.06)', padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>Your text will look like this</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.4, color: 'var(--ink)' }}>
            I saved you a free postcard on QuteNote 💌 Claim it with my personal link:
          </div>
          <img src="/brand/postmark_heart_stamp.png" alt="" style={{ width: '170px', alignSelf: 'flex-start' }} />
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, lineHeight: 1.45, color: 'var(--ink)' }}>
            You've been invited to join QuteNote, where birthdays are celebrated, hard times are acknowledged, and little surprises find their way to your mailbox.
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)', marginTop: '-8px' }}>qutenote.com/i/{user?.username ?? 'you'}-…</div>

          {composing ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their first name" required style={{
                width: '100%', height: '48px', padding: '0 14px', borderRadius: '10px', border: '1.5px solid var(--stone)',
                background: 'var(--card)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)',
              }} />
              <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" inputMode="tel" required style={{
                width: '100%', height: '48px', padding: '0 14px', borderRadius: '10px', border: '1.5px solid var(--stone)',
                background: 'var(--card)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)',
              }} />
              {error && <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--error)' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading} style={{
                  flex: 1, height: '52px', border: '2px solid #B4897A', borderRadius: '999px', background: '#BADAFF', color: '#4A2424',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase',
                  letterSpacing: '0.12em', cursor: 'pointer', opacity: loading ? 0.7 : 1,
                }}>{loading ? 'Sending…' : 'Send the text'}</button>
                <button type="button" onClick={() => setComposing(false)} style={{
                  height: '52px', padding: '0 16px', borderRadius: '999px', border: '2px solid #B4897A', background: '#FBF8F3',
                  color: '#4A2424', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
                  textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
                }}>Back</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={async () => { try { await inviteByText(user?.displayName?.split(' ')[0]); api.get('/invites').then((r) => setInvites(r.data.data)).catch(() => {}) } catch { setComposing(true) } }} style={{
                flex: 1, height: '52px', border: '2px solid #B4897A', borderRadius: '999px', background: '#BADAFF', color: '#4A2424',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase',
                letterSpacing: '0.12em', cursor: 'pointer',
              }}>Invite by text</button>
              <button onClick={async () => {
                try {
                  const r = await api.post('/invites', {})
                  await navigator.clipboard?.writeText(r.data.data.link)
                  setCopied(true); setTimeout(() => setCopied(false), 2000)
                  api.get('/invites').then((res) => setInvites(res.data.data)).catch(() => {})
                } catch { /* clipboard or network said no — button just stays */ }
              }} style={{
                height: '52px', padding: '0 16px', borderRadius: '999px', border: '2px solid #B4897A', background: '#FBF8F3',
                color: '#4A2424', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
                textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
              }}>{copied ? 'Copied' : 'Copy link'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
