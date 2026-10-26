import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { uploadPhoto } from '../../lib/uploadPhoto'
import { trackFunnel } from '../../lib/analytics'
import QEmoji from '../../components/QEmoji'
import QIcon from '../../components/QIcon'

// Become a QuteNote artist, step 1 of 3 (her qutenote-artists package,
// screen 02). Copy, sizes and spacing come straight from that file.
//
// Emerald, Oct 26: no SMS or ID service for now — we take the phone number
// and she verifies people by looking at their portfolio. The rights checkbox
// is what actually matters legally, so it stays required.

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box',
}
const fieldRow: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px',
  borderBottom: '1.5px solid var(--outline)',
}
const fieldInput: React.CSSProperties = {
  border: 0, outline: 'none', background: 'transparent', padding: 0,
  fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%',
}
const label: React.CSSProperties = { fontSize: '13px', color: 'var(--ink)' }

const BIO_MAX = 140

export default function ArtistApplyPage() {
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [link, setLink] = useState('')
  const [phone, setPhone] = useState('')
  const [rights, setRights] = useState(true)
  const [samples, setSamples] = useState<string[]>([])
  const [uploadingAt, setUploadingAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const slotRef = useRef<number>(0)

  async function pickSample(slot: number) {
    slotRef.current = slot
    fileRef.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingAt(slotRef.current)
    setError('')
    try {
      const url = await uploadPhoto(file)
      setSamples((prev) => {
        const next = [...prev]
        next[slotRef.current] = url
        return next.filter(Boolean)
      })
    } catch (err: any) {
      setError(`That picture didn't upload (${err?.message ?? 'unknown'}). Try another.`)
    } finally {
      setUploadingAt(null)
    }
  }

  async function submit() {
    setError('')
    if (!city.trim()) return setError('Which city are you in?')
    if (!bio.trim()) return setError('Add a short bio.')
    if (!link.trim()) return setError('Add a portfolio link or your Instagram.')
    if (!rights) return setError('Please confirm the work is yours to sell.')
    setSaving(true)
    try {
      const isHandle = link.trim().startsWith('@') || !/[./]/.test(link)
      await api.post('/artists/apply', {
        city: city.trim(),
        bio: bio.trim(),
        instagram: isHandle ? link.trim() : undefined,
        portfolioUrl: isHandle ? undefined : link.trim(),
        phone: phone.trim() || undefined,
        rightsConfirmed: true,
        sampleUploadIds: samples,
      })
      trackFunnel('artist', 'applied')
      navigate('/artist/sent', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "That didn't send. Try again.")
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
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>Step 1 of 3</span>
              <div aria-hidden style={{ display: 'flex', gap: '4px' }}>
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--highlight)' }} />
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--progress-track)' }} />
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--progress-track)' }} />
              </div>
            </div>
            <span style={{ width: '44px' }} />
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', lineHeight: '36px', letterSpacing: '-0.01em' }}>
              Become a QuteNote artist
            </h1>
            <QEmoji name="palette" size={66} style={{ flex: 'none', height: 'auto', transform: 'rotate(5deg)' }} />
          </div>
        </div>
      </header>

      <div style={{ ...col, marginTop: '16px' }}>
        {error && (
          <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--ink)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
            {error}
          </div>
        )}

        <div style={{ background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <label style={fieldRow}>
            <span style={label}>City</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Santa Fe, NM" style={fieldInput} />
          </label>
          <label style={fieldRow}>
            <span style={{ ...label, display: 'flex', justifyContent: 'space-between' }}>
              <span>Short bio</span>
              <span>{bio.length}/{BIO_MAX}</span>
            </span>
            <textarea
              rows={3}
              maxLength={BIO_MAX}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              placeholder="What you make, in a sentence or two."
              style={{ ...fieldInput, resize: 'none' }}
            />
          </label>
          <label style={{ ...fieldRow, borderBottom: 'none' }}>
            <span style={label}>Portfolio or Instagram</span>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="@yourhandle or a link" autoCapitalize="none" style={fieldInput} />
          </label>
        </div>

        <h2 style={{ margin: '20px 0 8px', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>Sample artwork</h2>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
          {[0, 1, 2].map((slot) => (
            <button
              key={slot}
              onClick={() => pickSample(slot)}
              aria-label={`Add sample artwork ${slot + 1}`}
              style={{
                aspectRatio: '1 / 1', borderRadius: '12px', border: '1.5px solid var(--outline)',
                background: samples[slot] ? 'var(--card)' : 'var(--light-blue)', padding: 0, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)', cursor: 'pointer',
                textTransform: 'none', letterSpacing: 0, fontWeight: 400,
              }}
            >
              {samples[slot] ? (
                <img src={samples[slot]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : uploadingAt === slot ? (
                'Adding…'
              ) : (
                <>
                  <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  Add
                </>
              )}
            </button>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '13px', lineHeight: '18px', fontFamily: 'var(--font-body)' }}>
          Up to three pieces that show your style.
        </p>

        {/* Her design has a "verify your phone or ID" row. Until there's a
            verification service, it's a phone field with the same look. */}
        <label className="qn-stamp" style={{
          marginTop: '28px', border: '10px solid transparent', minHeight: '64px',
          display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 12px',
        }}>
          <QEmoji name="lock" size={30} style={{ flex: 'none', height: 'auto' }} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>Your phone number</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="So we know every artist is real."
              inputMode="tel"
              style={{ ...fieldInput, fontSize: '13px' }}
            />
          </span>
        </label>

        <label style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', lineHeight: '18px', fontFamily: 'var(--font-body)' }}>
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px' }} />
          <span aria-hidden style={{
            width: '22px', height: '22px', flex: 'none', borderRadius: '6px', border: '1.5px solid var(--outline)',
            background: rights ? 'var(--btn)' : 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {rights && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
          </span>
          <span>This work is mine, and I have the right to sell prints of it.</span>
        </label>

        <button
          onClick={submit}
          disabled={saving}
          style={{
            marginTop: '22px', width: '100%', height: '56px', borderRadius: '28px', background: 'var(--btn)',
            border: '2px solid var(--outline)', boxSizing: 'border-box', cursor: saving ? 'default' : 'pointer',
            color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700,
            letterSpacing: '0.08em', textIndent: '0.08em', boxShadow: 'var(--shadow-button)', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'SENDING…' : 'SUBMIT APPLICATION'}
        </button>
      </div>
    </div>
  )
}
