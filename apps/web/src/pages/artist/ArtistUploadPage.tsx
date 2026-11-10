import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { trackFunnel } from '../../lib/analytics'
import QIcon from '../../components/QIcon'
import { IDEAL_PX, MIN_PX } from '../../lib/printSpec'

// Step 2 of 3: your three cards (her qutenote-artists package, screen 04).
//
// These are PRINT files, not previews, so they do not go through the usual
// photo shrink. We measure the file in the browser and refuse a small one
// before it is ever uploaded.
//
// THE NUMBERS, AND WHY THEY ARE TWO (Emerald, Nov 9 2026 — "raise the artist
// minimum to whatever is feasible"). We print in-house now and Ryan's
// InDesign template is built at 600 DPI. A 6x4 card with 0.125in bleed is
// 6.25 x 4.25in, so:
//   600 DPI = 3750 x 2550  — what we ask every artist for
//   300 DPI = 1875 x 1275  — the hard floor, below this it prints as mush
// The old floor was 1800 x 1200, which is 288 DPI: under the professional
// standard by a whisker.
//
// It is a floor AND a target rather than one hard 600 DPI rule because of who
// her artists are: iPad illustrators. Procreate caps layers by canvas size, so
// a huge number of working artists build card art at 300 DPI and physically
// cannot hand over 600. A 600 DPI wall would turn away good art. So anything
// between the two uploads fine and gets flagged as lower resolution for
// Emerald in the review desk and for Ryan in the print data.

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box',
}
// Numbers come from lib/printSpec so the card's measurements live in one file.
const MIN_LONG = MIN_PX.w
const MIN_SHORT = MIN_PX.h
const IDEAL_LONG = IDEAL_PX.w
const IDEAL_SHORT = IDEAL_PX.h

interface CardDraft { title: string; uploadId: string; url: string; width: number; height: number; status?: string }

export default function ArtistUploadPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState<CardDraft[]>([])
  const [rights, setRights] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const slotRef = useRef(0)

  useEffect(() => {
    api.get('/artists/me')
      .then((r) => {
        const profile = r.data.data
        if (!profile) { navigate('/artist/apply', { replace: true }); return }
        if (profile.status !== 'APPROVED') { navigate('/artist/sent', { replace: true }); return }
        setCards((profile.cards ?? []).map((c: any) => ({
          title: c.title, uploadId: c.uploadId, url: c.uploadId, width: c.width ?? 0, height: c.height ?? 0, status: c.status,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [navigate])

  function addAt(slot: number) {
    slotRef.current = slot
    fileRef.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const { width, height, dataUrl } = await readPrintFile(file)
      if (Math.max(width, height) < MIN_LONG || Math.min(width, height) < MIN_SHORT) {
        setError(`That file is ${width} by ${height}, too small to print. Cards need at least ${MIN_LONG} by ${MIN_SHORT}, and ${IDEAL_LONG} by ${IDEAL_SHORT} is what we'd love.`)
        return
      }
      // Printable, but not at the resolution the press is set up for. Say so
      // plainly and let them decide — it is their name on the card.
      if (Math.max(width, height) < IDEAL_LONG || Math.min(width, height) < IDEAL_SHORT) {
        setNotice(`That one is ${width} by ${height}, which will print fine. If you have a bigger export, ${IDEAL_LONG} by ${IDEAL_SHORT} prints sharper.`)
      } else {
        setNotice('')
      }
      const r = await api.post('/uploads', { dataUrl })
      const url = r.data.data.url as string
      setCards((prev) => {
        const next = [...prev]
        next[slotRef.current] = { title: next[slotRef.current]?.title ?? '', uploadId: url, url, width, height }
        return next
      })
    } catch (err: any) {
      setError(err?.response?.data?.error ?? `That file didn't go through (${err?.message ?? 'unknown'}).`)
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    setError('')
    const ready = cards.filter(Boolean)
    if (ready.length !== 3) return setError('Three cards, no more and no less.')
    if (ready.some((c) => !c.title.trim())) return setError('Every card needs a title.')
    if (!rights) return setError('Please confirm the work is yours to sell.')
    setBusy(true)
    try {
      await api.put('/artists/me/cards', {
        cards: ready.map((c) => ({ title: c.title.trim(), uploadId: c.uploadId, width: c.width, height: c.height })),
      })
      trackFunnel('artist', 'cards-submitted')
      navigate('/artist/payouts')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "That didn't send. Try again.")
      setBusy(false)
    }
  }

  const tag = (status?: string) => {
    if (!status) return null
    const approved = status === 'APPROVED'
    return (
      <span style={{
        fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body)', padding: '3px 9px', borderRadius: '10px',
        background: approved ? 'var(--highlight)' : 'var(--light-blush)', color: 'var(--ink)', whiteSpace: 'nowrap',
      }}>
        {approved ? 'Approved' : 'In review'}
      </span>
    )
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
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}>Step 2 of 3</span>
              <div aria-hidden style={{ display: 'flex', gap: '4px' }}>
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--highlight)' }} />
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--highlight)' }} />
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--progress-track)' }} />
              </div>
            </div>
            <span style={{ width: '44px' }} />
          </div>
          <h1 style={{ margin: '14px 0 0', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', lineHeight: '36px', letterSpacing: '-0.01em' }}>
            You're in! Add your cards.
          </h1>
        </div>
      </header>

      <div style={{ ...col, marginTop: '16px' }}>
        {error && (
          <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--ink)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ background: 'var(--light-blush)', border: '1px solid var(--stone)', color: 'var(--ink)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '14px', lineHeight: '19px', fontFamily: 'var(--font-body)' }}>
            {notice}
          </div>
        )}

        <div className="qn-stamp" style={{ border: '10px solid transparent', padding: '14px 12px' }}>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>Print-ready files only.</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', lineHeight: '18px', fontFamily: 'var(--font-body)' }}>
            4 × 6 inches at 600 DPI, so {IDEAL_LONG} × {IDEAL_SHORT} pixels. JPG or PNG. We'll take {MIN_LONG} × {MIN_SHORT} at a push, but bigger prints sharper. We check every card before it goes live.
          </p>
        </div>

        <h2 className="on-paper" style={{ margin: '22px 0 10px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '20px' }}>Your three cards</h2>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={onFile} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[0, 1, 2].map((slot) => {
            const card = cards[slot]
            return (
              <div key={slot} style={{
                background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px',
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'var(--shadow-card)',
              }}>
                <button
                  onClick={() => addAt(slot)}
                  aria-label={card ? `Replace card ${slot + 1}` : `Add card ${slot + 1}`}
                  style={{
                    width: '66px', height: '88px', flex: 'none', borderRadius: '8px', overflow: 'hidden', padding: 0,
                    border: '1.5px solid var(--outline)', background: 'var(--light-blue)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {card
                    ? <img src={card.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
                </button>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    value={card?.title ?? ''}
                    onChange={(e) => setCards((prev) => {
                      const next = [...prev]
                      next[slot] = { ...(next[slot] ?? { uploadId: '', url: '', width: 0, height: 0 }), title: e.target.value }
                      return next
                    })}
                    placeholder={card ? 'Give it a title' : `Add your ${['first', 'second', 'third'][slot]} card`}
                    disabled={!card}
                    style={{
                      border: 0, outline: 'none', background: 'transparent', padding: 0, width: '100%',
                      fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)',
                    }}
                  />
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                    {card ? `${card.width} × ${card.height}` : `JPG or PNG, ${IDEAL_LONG} × ${IDEAL_SHORT} ideally`}
                  </span>
                </span>
                {tag(card?.status)}
              </div>
            )
          })}
        </div>

        <label style={{ marginTop: '18px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', lineHeight: '18px', fontFamily: 'var(--font-body)' }}>
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px' }} />
          <span aria-hidden style={{
            width: '22px', height: '22px', flex: 'none', borderRadius: '6px', border: '1.5px solid var(--outline)',
            background: rights ? 'var(--btn)' : 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {rights && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
          </span>
          <span>These are my original works, and I have the right to sell prints of them.</span>
        </label>

        <button
          onClick={submit}
          disabled={busy || loading}
          style={{
            marginTop: '22px', width: '100%', height: '56px', borderRadius: '28px', background: 'var(--btn)',
            boxSizing: 'border-box', cursor: busy ? 'default' : 'pointer',
            color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700,
            letterSpacing: '0.08em', textIndent: '0.08em', boxShadow: 'var(--shadow-button)', opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'WORKING…' : 'SUBMIT FOR REVIEW'}
        </button>
      </div>
    </div>
  )
}

// Read the file at full size and measure it. No shrinking: this is the file
// that gets printed.
function readPrintFile(file: File): Promise<{ width: number; height: number; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('could not read that file'))
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, dataUrl })
      img.onerror = () => reject(new Error('that file is not a picture this can read'))
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}
