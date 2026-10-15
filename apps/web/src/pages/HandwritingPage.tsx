import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SESSIONS, ALL_CHARS, TOTAL_CHARS, charName, type HandwritingSession } from '../lib/handwriting/alphabet'
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
    ctx.fillStyle = '#231A3A'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const all = liveStroke ? [...strokes, liveStroke] : strokes
    for (const stroke of all) {
      if (stroke.length === 1) {
        // A tap with no drag — draw it as a dot (i/j tittle, a period) rather
        // than silently dropping it.
        ctx.beginPath()
        ctx.arc(stroke[0].x, stroke[0].y, 4, 0, Math.PI * 2)
        ctx.fill()
        continue
      }
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
        // A plain tap (no drag) is exactly one point — that's a dot (the tittle
        // on an i/j, a period). Keep it instead of discarding it as "too short."
        if (currentRef.current.length >= 1) onDraw([...strokes, currentRef.current])
        currentRef.current = []
      }}
      onPointerLeave={() => {
        if (!drawingRef.current) return
        drawingRef.current = false
        if (currentRef.current.length >= 1) onDraw([...strokes, currentRef.current])
        currentRef.current = []
      }}
    />
  )
}

/* ── One writing session: steps through a session's characters ──
   Saves after every letter (not just at the end) — safe to back out or lose
   signal at any point, and lets you step backward to redraw a letter you
   already wrote since whatever's saved is what reloads when you return. ── */
function SessionFlow({ session, existingGlyphs, onDone, onAllComplete }: {
  session: HandwritingSession
  existingGlyphs: GlyphStrokes
  onDone: (merged: GlyphStrokes) => void
  onAllComplete: () => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [index, setIndex] = useState(0)
  const [glyphs, setGlyphs] = useState<GlyphStrokes>(existingGlyphs)
  const [currentStrokes, setCurrentStrokes] = useState<Stroke[]>(existingGlyphs[session.chars[0]] ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const char = session.chars[index]
  const displayChar = char === ' ' ? '␣' : char

  function goTo(newIndex: number, fromGlyphs: GlyphStrokes) {
    setIndex(newIndex)
    setCurrentStrokes(fromGlyphs[session.chars[newIndex]] ?? [])
  }

  async function commitAndAdvance(direction: 1 | -1) {
    const updated = currentStrokes.length ? { ...glyphs, [char]: currentStrokes } : glyphs
    setGlyphs(updated)
    setSaving(true)
    setError('')
    try {
      const merged = await saveHandwritingProgress(existingGlyphs, updated, `QuteNote-${user?.username ?? 'you'}-Handwriting`)
      onDone(merged)
      const nextIndex = index + direction
      if (direction === -1) {
        goTo(nextIndex, updated)
      } else if (nextIndex < session.chars.length) {
        goTo(nextIndex, updated)
      } else if (ALL_CHARS.every((c) => merged[c]?.length)) {
        onAllComplete()
      } else {
        navigate('/handwriting', { replace: true })
      }
    } catch {
      setError("That didn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 24px 60px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '6px' }}>
        {index > 0 && (
          <button onClick={() => commitAndAdvance(-1)} disabled={saving} aria-label="Previous letter" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mid)', padding: '4px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mid)' }}>
          {session.label} · {index + 1} of {session.chars.length}
        </p>
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: 400, color: 'var(--ink)', margin: '0 0 2px' }}>
        {displayChar}
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', margin: '0 0 14px' }}>
        {charName(session.key, char)}
      </p>
      <LetterCanvas strokes={currentStrokes} onDraw={setCurrentStrokes} />
      <p style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', marginTop: '10px' }}>
        Just tap for a dot — i, j, and periods don't need a drag.
      </p>

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
          onClick={() => commitAndAdvance(1)}
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

/* ── Shown once every character across every session has been written ── */
function AllDoneScreen({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <span style={{ fontSize: '56px', marginBottom: '14px' }}>🎉</span>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 400, color: 'var(--ink)', marginBottom: '10px' }}>
        You did it!
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', maxWidth: '320px', marginBottom: '32px' }}>
        Your handwriting is ready. Every note you write from here can look like it came straight from your own pen.
      </p>
      <button onClick={() => navigate('/send')} style={{
        width: '100%', maxWidth: '320px', height: '52px', borderRadius: '10px', border: 'none', cursor: 'pointer',
        background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
        textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px',
      }}>
        Write a note
      </button>
      <button onClick={onClose} style={{
        width: '100%', maxWidth: '320px', height: '52px', borderRadius: '10px', border: '1.5px solid var(--stone)', cursor: 'pointer',
        background: 'none', color: 'var(--ink-mid)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
        textTransform: 'uppercase', letterSpacing: '0.12em',
      }}>
        Back to your handwriting
      </button>
    </div>
  )
}

/* ── Overview: pick a session, see progress ── */
export default function HandwritingPage() {
  const navigate = useNavigate()
  const { sessionKey } = useParams()
  const [glyphs, setGlyphs] = useState<GlyphStrokes | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    fetchHandwritingProgress().then((r) => setGlyphs(r.glyphs)).catch(() => setGlyphs({}))
  }, [])

  const activeSession = SESSIONS.find((s) => s.key === sessionKey)

  if (celebrating) {
    return <AllDoneScreen onClose={() => { setCelebrating(false); navigate('/handwriting', { replace: true }) }} />
  }

  if (activeSession) {
    if (glyphs === null) return null
    return (
      <div style={{ minHeight: '100vh' }}>
        <nav style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate('/handwriting', { replace: true })} aria-label="Back" style={{
            width: '36px', height: '36px', borderRadius: '50%', background: 'var(--lavender-pale)',
            border: 'none', cursor: 'pointer', color: uv, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)' }}>Your handwriting</span>
        </nav>
        <SessionFlow
          key={activeSession.key}
          session={activeSession}
          existingGlyphs={glyphs}
          onDone={setGlyphs}
          onAllComplete={() => setCelebrating(true)}
        />
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
              onClick={() => navigate(`/handwriting/${s.key}`, { replace: true })}
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
