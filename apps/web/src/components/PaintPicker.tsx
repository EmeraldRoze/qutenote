import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { trackFeature, trackError } from '../lib/analytics'

// Turn your photo into a painting (Emerald, Nov 19 2026).
//
// HOW IT IS SHAPED, and why:
//
// ONE RENDER PER MEDIUM, NOT ONE PER LOOK. Every render costs real money, so
// the tiles below are fixed samples, the same for everybody. You pick a
// medium, we paint your photo ONCE, and the slider then does the rest for
// free. Rendering the person's own photo five times so they could browse
// would have cost three times as much per card for the same experience.
//
// THE SLIDER IS A CROSS-FADE, not another render. The server hands back a
// painting that has already been pulled into register with the photo, so the
// two line up pixel for pixel and mixing them reads as "more paint" rather
// than as a double exposure. (Before that registration existed, this slider
// ghosted every edge, which is how we found the problem.)
//
// THE OIL STOPS AT 60. Her rule: faces never get big thick strokes. It is in
// the prompt too, but the model treats that as a preference rather than a
// law, so the dial physically cannot reach the point where it starts leaving
// stroke marks on skin.

export type Medium = 'watercolour' | 'oil' | 'pencil' | 'ink' | 'risograph'

const MEDIA: { key: Medium; label: string; blurb: string }[] = [
  { key: 'watercolour', label: 'Watercolour', blurb: 'soft washes on paper' },
  { key: 'oil', label: 'Oil painting', blurb: 'thick paint on canvas' },
  { key: 'pencil', label: 'Pencil', blurb: 'hand-drawn in graphite' },
  { key: 'ink', label: 'Pen and ink', blurb: 'lines and cross-hatching' },
  { key: 'risograph', label: 'Risograph', blurb: 'two-ink print' },
]

export default function PaintPicker({ photoUrl, uploadId, onApply }: {
  photoUrl: string
  uploadId: string
  onApply: (dataUrl: string, medium: Medium, strength: number) => void
}) {
  const [medium, setMedium] = useState<Medium | null>(null)
  const [painting, setPainting] = useState<string | null>(null)
  const [limits, setLimits] = useState({ max: 100, default: 75 })
  const [strength, setStrength] = useState(75)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function choose(m: Medium) {
    if (busy) return
    setMedium(m); setError(''); setBusy(true); setPainting(null)
    trackFeature('photo-paint', { medium: m })
    try {
      const r = await api.post(`/uploads/${uploadId}/paint`, { medium: m })
      const d = r.data.data
      setPainting(d.url)
      setLimits({ max: d.max, default: d.default })
      setStrength(d.default)
    } catch (err: any) {
      const detail = err?.response?.data?.error ?? err?.message ?? 'unknown'
      trackError(`painting failed: ${detail}`, { medium: m })
      setError(detail)
      setMedium(null)
    } finally {
      setBusy(false)
    }
  }

  // Draw photo, then the painting over it at the chosen strength. The result
  // is what actually goes on the card, so it is baked here rather than being
  // a CSS effect that the printer would never see.
  useEffect(() => {
    if (!painting) return
    const canvas = canvasRef.current
    if (!canvas) return
    const base = new Image(); const art = new Image()
    base.crossOrigin = 'anonymous'; art.crossOrigin = 'anonymous'
    let loaded = 0
    const draw = () => {
      if (++loaded < 2) return
      // Draw at the PAINTING's resolution, not the photo's. The painting is
      // where the brush texture lives, and sizing the canvas to a smaller
      // photo would throw that away on the way to the card.
      canvas.width = Math.max(base.naturalWidth, art.naturalWidth)
      canvas.height = Math.max(base.naturalHeight, art.naturalHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1
      ctx.drawImage(base, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = strength / 100
      ctx.drawImage(art, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1
    }
    base.onload = draw; art.onload = draw
    base.src = photoUrl; art.src = painting
  }, [painting, strength, photoUrl])

  function apply() {
    const canvas = canvasRef.current
    if (!canvas || !medium) return
    onApply(canvas.toDataURL('image/jpeg', 0.92), medium, strength)
  }

  return (
    <div style={{ marginTop: '18px' }}>
      <p className="on-paper" style={{ margin: '0 0 10px', fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)' }}>
        Make it a painting
      </p>

      <div role="group" aria-label="Painting styles" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        {MEDIA.map((m) => {
          const on = medium === m.key
          return (
            <button
              key={m.key}
              onClick={() => choose(m.key)}
              disabled={busy}
              aria-pressed={on}
              style={{
                flex: 'none', width: '104px', padding: '8px', borderRadius: '14px', cursor: busy ? 'default' : 'pointer',
                border: `2px solid ${on ? 'var(--ink)' : 'var(--outline)'}`,
                background: on ? 'var(--selected-fill)' : 'var(--card)',
                textTransform: 'none', letterSpacing: 0, opacity: busy && !on ? 0.5 : 1,
              }}
            >
              <img
                src={`/paint-samples/${m.key}.jpg`}
                alt=""
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '9px', display: 'block' }}
              />
              <span style={{ display: 'block', marginTop: '6px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{m.label}</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink)', opacity: 0.75 }}>{m.blurb}</span>
            </button>
          )
        })}
      </div>

      {busy && (
        <p className="on-paper" style={{ margin: '12px 0 0', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>
          Painting your photo. This takes about fifteen seconds, carry on writing and come back.
        </p>
      )}

      {error && (
        <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--error)' }}>{error}</p>
      )}

      {painting && (
        <div style={{ marginTop: '14px' }}>
          <canvas ref={canvasRef} style={{ width: '100%', borderRadius: '14px', display: 'block', border: '1.5px solid var(--outline)' }} />

          <label style={{ display: 'block', marginTop: '12px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)' }}>
            How painted {strength}%
            <input
              type="range"
              min={0}
              max={limits.max}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px' }}
            />
          </label>

          <div className="qn-actions-row" style={{ marginTop: '10px' }}>
            <button className="qn-stamp qn-action qn-action-square" onClick={apply}>USE THIS</button>
            <button className="qn-stamp qn-action qn-action-square" onClick={() => { setPainting(null); setMedium(null) }}
              style={{ ['--qn-panel' as string]: 'var(--card)' }}>KEEP MY PHOTO</button>
          </div>
        </div>
      )}
    </div>
  )
}
