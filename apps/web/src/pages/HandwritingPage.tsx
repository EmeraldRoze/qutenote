import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SESSIONS, ALL_CHARS, TOTAL_CHARS, type HandwritingSession } from '../lib/handwriting/alphabet'
import { HANDWRITING_CANVAS_SIZE, HANDWRITING_BASELINE_Y, type GlyphStrokes, type Stroke, type Point } from '../lib/handwriting/compileFont'
import { fetchHandwritingProgress, saveHandwritingProgress } from '../lib/handwriting/api'

const uv = '#5A32D6'
const CSS_SIZE = 280

/* ── The writing canvas: captures pen strokes for one letter at a time ── */
function LetterCanvas({ strokes, onDraw }: {
  strokes: Stroke[]
  onDraw: (strokes: Stroke[]) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const currentRef = useRef<Stroke>([])

  function redraw(liveStroke?: Stroke) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, HANDWRITING_CANVAS_SIZE, HANDWRITING_CANVAS_SIZE)
    ctx.strokeStyle = '#E6E1DC'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, HANDWRITING_BASELINE_Y)
    ctx.lineTo(HANDWRITING_CANVAS_SIZE, HANDWRITING_BASELINE_Y)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = '#231A3A'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const all = liveStroke ? [...strokes, liveStroke] : strokes
    for (const stroke of all) {
      if (stroke.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)
      for (const p of stroke.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = HANDWRITING_CANVAS_SIZE * dpr
    canvas.height = HANDWRITING_CANVAS_SIZE * dpr
    const ctx = canvas.getContext('2d')
    ctx?.scale(dpr, dpr)
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { redraw() }, [strokes]) // eslint-disable-line react-hooks/exhaustive-deps

  function posFromEvent(e: React.PointerEvent): Point {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scale = HANDWRITING_CANVAS_SIZE / rect.width
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale }
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${CSS_SIZE}px`, height: `${CSS_SIZE}px`, borderRadius: '20px',
        background: '#fff', border: `1.5px solid var(--stone)`, touchAction: 'none', display: 'block', margin: '0 auto',
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        drawingRef.current = true
        currentRef.current = [posFromEvent(e)]
        canvasRef.current?.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drawingRef.current) return
        currentRef.current.push(posFromEvent(e))
        redraw(currentRef.current)
      }}
      onPointerUp={() => {
        if (!drawingRef.current) return
        drawingRef.current = false
        if (currentRef.current.length > 1) onDraw([...strokes, currentRef.current])
        currentRef.current = []
      }}
      onPointerLeave={() => {
        if (!drawingRef.current) return
        drawingRef.current = false
        if (currentRef.current.length > 1) onDraw([...strokes, currentRef.current])
        currentRef.current = []
      }}
    />
  )
}

/* ── One writing session: steps through a session's characters ── */
function SessionFlow({ session, existingGlyphs, onDone }: {
  session: HandwritingSession
  existingGlyphs: GlyphStrokes
  onDone: (merged: GlyphStrokes) => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [index, setIndex] = useState(0)
  const [captured, setCaptured] = useState<GlyphStrokes>({})
  const [currentStrokes, setCurrentStrokes] = useState<Stroke[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const char = session.chars[index]
  const displayChar = char === ' ' ? '␣' : char

  function next() {
    const updatedCaptured = currentStrokes.length ? { ...captured, [char]: currentStrokes } : captured
    setCaptured(updatedCaptured)
    setCurrentStrokes([])
    if (index + 1 < session.chars.length) {
      setIndex(index + 1)
    } else {
      finish(updatedCaptured)
    }
  }

  async function finish(finalCaptured: GlyphStrokes) {
    setSaving(true)
    setError('')
    try {
      const merged = await saveHandwritingProgress(existingGlyphs, finalCaptured, `QuteNote-${user?.username ?? 'you'}-Handwriting`)
      onDone(merged)
      navigate('/handwriting')
    } catch {
      setError("That didn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 24px 60px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mid)', marginBottom: '6px' }}>
        {session.label} · {index + 1} of {session.chars.length}
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: 400, color: 'var(--ink)', margin: '0 0 18px' }}>
        {displayChar}
      </h1>
      <LetterCanvas strokes={currentStrokes} onDraw={setCurrentStrokes} />

      {error && <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: '#B3261E', marginTop: '14px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          onClick={() => setCurrentStrokes([])}
          disabled={!currentStrokes.length}
          style={{
            flex: 1, height: '50px', borderRadius: '10px', border: '1.5px solid var(--stone)', cursor: 'pointer',
            background: '#fff', color: 'var(--ink-mid)', opacity: currentStrokes.length ? 1 : 0.5,
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}
        >
          Clear
        </button>
        <button
          onClick={next}
          disabled={!currentStrokes.length || saving}
          style={{
            flex: 2, height: '50px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: uv, color: '#fff', opacity: currentStrokes.length && !saving ? 1 : 0.45,
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
          }}
        >
          {saving ? 'Saving…' : index + 1 < session.chars.length ? 'Next letter' : 'Finish'}
        </button>
      </div>
    </div>
  )
}

/* ── Overview: pick a session, see progress ── */
export default function HandwritingPage() {
  const navigate = useNavigate()
  const { sessionKey } = useParams()
  const [glyphs, setGlyphs] = useState<GlyphStrokes | null>(null)

  useEffect(() => {
    fetchHandwritingProgress().then((r) => setGlyphs(r.glyphs)).catch(() => setGlyphs({}))
  }, [])

  const activeSession = SESSIONS.find((s) => s.key === sessionKey)

  if (activeSession) {
    if (glyphs === null) return null
    return (
      <div style={{ minHeight: '100vh' }}>
        <nav style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate('/handwriting')} aria-label="Back" style={{
            width: '36px', height: '36px', borderRadius: '50%', background: 'var(--lavender-pale)',
            border: 'none', cursor: 'pointer', color: uv, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)' }}>Your handwriting</span>
        </nav>
        <SessionFlow session={activeSession} existingGlyphs={glyphs} onDone={setGlyphs} />
      </div>
    )
  }

  const doneCount = glyphs ? ALL_CHARS.filter((c) => glyphs[c]?.length).length : 0

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <nav style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{
          width: '36px', height: '36px', borderRadius: '50%', background: 'var(--lavender-pale)',
          border: 'none', cursor: 'pointer', color: uv, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)' }}>Your handwriting</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', lineHeight: 1.5, marginBottom: '8px' }}>
          Write a few letters and QuteNote turns them into a font, so what you type shows up in your own handwriting.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '22px' }}>
          {doneCount} of {TOTAL_CHARS} letters written. Do it all now, or come back anytime.
        </p>

        {SESSIONS.map((s) => {
          const sessionDone = s.chars.filter((c) => glyphs?.[c]?.length).length
          const complete = sessionDone === s.chars.length
          return (
            <button
              key={s.key}
              onClick={() => navigate(`/handwriting/${s.key}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '16px 18px', borderRadius: '16px', background: '#fff', border: '1px solid var(--stone)',
                marginBottom: '10px', cursor: 'pointer', textAlign: 'left', textTransform: 'none', letterSpacing: 0, fontWeight: 400,
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)' }}>{sessionDone} of {s.chars.length} done</div>
              </div>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: complete ? uv : 'var(--ink-mid)',
              }}>
                {complete ? '✓ Done' : sessionDone > 0 ? 'Continue' : 'Start'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
