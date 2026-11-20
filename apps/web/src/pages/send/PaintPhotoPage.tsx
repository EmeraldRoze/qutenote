import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { uploadPhoto } from '../../lib/uploadPhoto'
import { trackFeature, trackError, trackScreen } from '../../lib/analytics'
import QIcon from '../../components/QIcon'
import QEmoji from '../../components/QEmoji'

// Making your photo into a painting, on its own screen (Emerald, Nov 19:
// "it is weird that it all happens on this page... it needs to happen on its
// own screen").
//
// Three things she asked for and the reasons they matter:
//   - a BACK button, because the editing step had no way out;
//   - a way to CHANGE THE PHOTO without leaving, because the first thing
//     anyone does after seeing a painting they dislike is try another photo;
//   - room to actually see the picture, which a strip squeezed under the
//     card carousel never had.
//
// WHY THE SLIDER IS FREE: each render costs real money, so the tiles are
// fixed samples and we paint ONCE. The slider cross-fades the painting back
// over the photo, which works only because the server has already pulled the
// two into register. Before that existed, every edge doubled.

// Pencil was cut on her call (Emerald, Nov 20: "i dont think its good").
export type Medium = 'watercolour' | 'oil' | 'ink' | 'risograph'

// Labels sized to FIT their tile whole (Emerald, Nov 20): "Oil paint" and
// the ampersand are hers, so no name ever ends in "…".
const MEDIA: { key: Medium; label: string }[] = [
  { key: 'watercolour', label: 'Watercolour' },
  { key: 'oil', label: 'Oil paint' },
  { key: 'ink', label: 'Pen & ink' },
  { key: 'risograph', label: 'Risograph' },
]

export default function PaintPhotoPage({ photoUrl, uploadId, onDone, onBack, onPhotoChanged }: {
  photoUrl: string
  uploadId: string
  /** Bake in whatever is on screen (painted or not) and move to writing. */
  onDone: (dataUrl: string | null, medium: Medium | null, strength: number) => Promise<void> | void
  onBack: () => void
  onPhotoChanged: (url: string, id: string) => void
}) {
  const [medium, setMedium] = useState<Medium | null>(null)
  const [painting, setPainting] = useState<string | null>(null)
  const [limits, setLimits] = useState({ max: 100, default: 75 })
  const [strength, setStrength] = useState(75)
  // Paintings already made on THIS screen, so flicking between styles never
  // re-renders (or re-bills) one we have (Emerald, Nov 20: "it doesn't
  // remember that it's already generated it"). Also keeps each style's
  // slider position. Cleared when the photo changes.
  const madeRef = useRef<Partial<Record<Medium, { url: string; max: number; default: number; strength: number }>>>({})
  // A live percent while the painting is made (Emerald, Nov 20). The model
  // reports nothing until it finishes, so this is a tuned estimate: it rises
  // quickly at first, slows as it nears the top, holds at 95 if the model is
  // having a slow day, and the finished painting is what completes it.
  const [progress, setProgress] = useState(0)
  const progressTimer = useRef<number | null>(null)
  function startProgress() {
    const t0 = Date.now()
    setProgress(1)
    stopProgress()
    progressTimer.current = window.setInterval(() => {
      const s = (Date.now() - t0) / 1000
      setProgress(Math.min(95, Math.round(100 * (1 - Math.exp(-s / 20)))))
    }, 400)
  }
  function stopProgress() {
    if (progressTimer.current !== null) { clearInterval(progressTimer.current); progressTimer.current = null }
  }
  useEffect(() => stopProgress, [])
  const [busy, setBusy] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { trackScreen('/send/paint') }, [])

  // Which style the person is LOOKING AT right now. A render that finishes
  // in the background checks this before touching the screen, so wandering
  // off to another style mid-render is always allowed (Emerald, Nov 20:
  // "You should be able to click back even when it's in the middle of
  // processing") and the stray painting just lands quietly in madeRef.
  const mediumRef = useRef<Medium | null>(null)
  // The style currently cooking, and the photo it belongs to, so a render
  // that outlives a photo swap gets thrown away instead of cached wrongly.
  const inFlightRef = useRef<Medium | null>(null)
  const uploadIdRef = useRef(uploadId)
  uploadIdRef.current = uploadId

  async function choose(m: Medium) {
    if (busy && inFlightRef.current === m) {
      // Coming back to watch the one that is still cooking.
      mediumRef.current = m
      setMedium(m); setError(''); setPainting(null)
      return
    }
    const made = madeRef.current[m]
    if (made) {
      // Already made: switching to it is free and allowed any time, even
      // while a different style is still cooking.
      mediumRef.current = m
      setMedium(m); setError(''); setPainting(made.url)
      setLimits({ max: made.max, default: made.default }); setStrength(made.strength)
      return
    }
    if (busy) return // one render at a time; unmade styles wait their turn
    mediumRef.current = m
    inFlightRef.current = m
    setMedium(m); setError(''); setBusy(true); setPainting(null)
    startProgress()
    trackFeature('photo-paint', { medium: m })
    const forUpload = uploadId
    try {
      const r = await api.post(`/uploads/${uploadId}/paint`, { medium: m })
      if (uploadIdRef.current !== forUpload) return // photo changed mid-render
      const d = r.data.data
      madeRef.current[m] = { url: d.url, max: d.max, default: d.default, strength: d.default }
      if (mediumRef.current === m) {
        setPainting(d.url); setLimits({ max: d.max, default: d.default }); setStrength(d.default)
      }
    } catch (err: any) {
      const detail = err?.response?.data?.error ?? err?.message ?? 'unknown'
      trackError(`painting failed: ${detail}`, { medium: m })
      if (mediumRef.current === m) {
        setError(detail === 'Network Error'
          ? 'That one took too long and gave up. Try it again, or try another style.'
          : detail)
        mediumRef.current = null
        setMedium(null)
      }
    } finally { inFlightRef.current = null; setBusy(false); stopProgress() }
  }

  async function swapPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSwapping(true); setError('')
    try {
      const url = await uploadPhoto(file)
      onPhotoChanged(url, url.split('/').pop() ?? '')
      madeRef.current = {} // new photo, nothing made for it yet
      mediumRef.current = null
      setPainting(null); setMedium(null)
    } catch (err: any) {
      setError("That photo didn't upload. Try another one.")
    } finally { setSwapping(false); e.target.value = '' }
  }

  // Draw the photo, then the painting over it at the chosen strength. The
  // canvas is sized from the PAINTING, because that is where the brush
  // texture lives and a smaller photo would throw it away before printing.
  useEffect(() => {
    if (!painting) return
    const canvas = canvasRef.current
    if (!canvas) return
    const base = new Image(); const art = new Image()
    base.crossOrigin = 'anonymous'; art.crossOrigin = 'anonymous'
    let loaded = 0
    const draw = () => {
      if (++loaded < 2) return
      canvas.width = Math.max(base.naturalWidth, art.naturalWidth)
      canvas.height = Math.max(base.naturalHeight, art.naturalHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(base, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = strength / 100
      ctx.drawImage(art, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1
    }
    base.onload = draw; art.onload = draw
    base.src = photoUrl; art.src = painting
  }, [painting, strength, photoUrl])

  // ONE forward action (Emerald, Nov 19). Whatever is on the screen is what
  // goes on the card: a painting if they picked one, their plain photo if
  // they did not. No separate "use this" versus "keep my photo" decision,
  // because the picture in front of them already answers it.
  async function next() {
    const canvas = canvasRef.current
    setSaving(true)
    try {
      if (painting && medium && canvas) {
        await onDone(canvas.toDataURL('image/jpeg', 0.92), medium, strength)
      } else {
        await onDone(null, null, 0)
      }
    } finally { setSaving(false) }
  }

  // A real full screen, not a section inside the send page (Emerald, Nov 19).
  // It sits OVER everything: the "Send a little somethin'" band, the ruled
  // paper and the tab bar were all still showing underneath, which pushed the
  // styles and the button below the fold. Plain background, no ruling, and a
  // column that fits the screen exactly so nothing ever needs scrolling.
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 120,
      background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
    }}>
      {/* Nothing up here but the way back and the way to another photo. */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 16px 2px' }}>
        <button onClick={onBack} aria-label="Back" style={{
          width: '44px', height: '44px', borderRadius: '50%', background: 'var(--light-blush)',
          border: 'none', cursor: 'pointer', color: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0,
        }}>
          <QIcon name="chevron-left" size={18} />
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={() => fileRef.current?.click()} disabled={swapping} aria-label="Choose a different photo" style={{
          width: '44px', height: '44px', borderRadius: '50%', background: 'var(--card)',
          border: '1.5px solid var(--outline)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0,
        }}>
          <QEmoji name="camera" size={24} style={{ height: '24px', width: 'auto', objectFit: 'contain' }} />
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={swapPhoto} />

      {/* The picture takes whatever room is left over, and no more. */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 16px' }}>
        <canvas ref={canvasRef} style={{
          maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto',
          objectFit: 'contain', borderRadius: '14px',
          display: painting ? 'block' : 'none',
        }} />
        {!painting && (
          <img src={photoUrl} alt="Your photo" style={{
            maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto',
            objectFit: 'contain', borderRadius: '14px', display: 'block',
          }} />
        )}
      </div>

      {/* What's happening, right under the picture and centred (Emerald,
          Nov 20). It keeps its height when empty so nothing jumps. */}
      <div style={{
        flex: 'none', minHeight: '20px', padding: '2px 16px 4px', textAlign: 'center',
        fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)',
      }}>
        {swapping ? 'Loading your photo…'
          : error ? <span style={{ color: 'var(--error)' }}>{error}</span>
          : painting ? `How painted: ${strength}%`
          : busy ? `Painting… ${progress}%`
          : ''}
      </div>

      {/* Everything else lives along the bottom, Instagram-style (her
          reference, Nov 19): the choices under the picture, and the way
          forward centred beneath them (Emerald, Nov 20). */}
      <div style={{ flex: 'none', padding: '0 14px' }}>
        {painting && (
          <input
            type="range" min={0} max={limits.max} value={strength}
            aria-label={`How painted, ${strength} percent`}
            onChange={(e) => {
              const v = Number(e.target.value)
              setStrength(v)
              if (medium && madeRef.current[medium]) madeRef.current[medium]!.strength = v
            }}
            style={{ width: '100%', margin: '0 0 8px' }}
          />
        )}

        <div role="group" aria-label="Painting styles" style={{ display: 'flex', gap: '9px', overflowX: 'auto', paddingBottom: '2px' }}>
          {/* The photo as it came, so going back to no filter is one tap. */}
          <button onClick={() => { mediumRef.current = null; setPainting(null); setMedium(null); setError('') }}
            disabled={swapping} aria-pressed={!medium}
            style={{
              flex: 'none', width: '88px', padding: '4px', borderRadius: '11px', cursor: 'pointer',
              border: `2px solid ${!medium ? 'var(--ink)' : 'var(--outline)'}`,
              background: !medium ? 'var(--selected-fill)' : 'var(--card)',
              textTransform: 'none', letterSpacing: 0,
            }}>
            <img src={photoUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '7px', display: 'block' }} />
            <span style={{ display: 'block', marginTop: '3px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'var(--ink)' }}>Original</span>
          </button>

          {MEDIA.map((m) => {
            const on = medium === m.key
            // While one style cooks, every style that already exists (and
            // the cooking one itself) stays tappable; only unmade ones wait.
            const locked = swapping || (busy && !madeRef.current[m.key] && inFlightRef.current !== m.key)
            return (
              <button key={m.key} onClick={() => choose(m.key)} disabled={locked} aria-pressed={on}
                style={{
                  flex: 'none', width: '88px', padding: '4px', borderRadius: '11px',
                  cursor: locked ? 'default' : 'pointer',
                  border: `2px solid ${on ? 'var(--ink)' : 'var(--outline)'}`,
                  background: on ? 'var(--selected-fill)' : 'var(--card)',
                  textTransform: 'none', letterSpacing: 0, opacity: locked && !on ? 0.5 : 1,
                }}>
                <img src={`/paint-samples/${m.key}.jpg`} alt=""
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '7px', display: 'block' }} />
                <span style={{ display: 'block', marginTop: '3px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', minHeight: '46px' }}>
          {/* A rectangle with the words on ONE line, not the square stamp
              (Emerald, Nov 19). .qn-action-square forces 102x102 and wraps. */}
          <button className="qn-stamp qn-action" disabled={saving || swapping || (busy && !painting)} onClick={next}
            style={{ flex: 'none', whiteSpace: 'nowrap' }}>
            {saving ? 'SAVING…' : 'WRITE ON IT'}
          </button>
        </div>
      </div>
    </div>
  )
}
