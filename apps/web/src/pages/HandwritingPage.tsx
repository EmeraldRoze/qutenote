import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SESSIONS, WORD_SESSIONS, ALL_CHARS, TOTAL_CHARS, charName, type WordSession } from '../lib/handwriting/alphabet'
import { HANDWRITING_CANVAS_SIZE, HANDWRITING_BASELINE_Y, FONT_COMPILER_VERSION, type GlyphStrokes, type Stroke, type Point } from '../lib/handwriting/compileFont'
import { segmentWord, toGlyphSpace } from '../lib/handwriting/segment'
import { WEB_BUILD } from '../lib/buildGuard'
import { fetchHandwritingProgress, saveHandwritingProgress } from '../lib/handwriting/api'

// Teach-your-handwriting, word edition (Emerald's Oct 17 idea): people write
// whole little words so their letters come out of real flow instead of stiff
// one-at-a-time drawing. The app slices each word into letters, shows the
// slice for approval, and a touch-up mode lets you redo any single letter.

const uv = '#5A32D6'

/* ── Shared ink-drawing helpers ── */

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], liveStroke?: Stroke) {
  ctx.strokeStyle = '#231A3A'
  ctx.fillStyle = '#231A3A'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const all = liveStroke ? [...strokes, liveStroke] : strokes
  for (const stroke of all) {
    if (stroke.length === 1) {
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

/* ── The WORD canvas: wide, ruled, captures a whole word of ink ── */

const WORD_W = 640
const WORD_H = 280
const WORD_BASELINE = 200

function WordCanvas({ strokes, onDraw }: { strokes: Stroke[]; onDraw: (s: Stroke[]) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const currentRef = useRef<Stroke>([])

  function redraw(liveStroke?: Stroke) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, WORD_W, WORD_H)
    // baseline + a faint x-height guide
    ctx.strokeStyle = '#E6E1DC'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, WORD_BASELINE); ctx.lineTo(WORD_W, WORD_BASELINE); ctx.stroke()
    ctx.strokeStyle = '#F0EBE4'
    ctx.beginPath(); ctx.moveTo(0, WORD_BASELINE - 70); ctx.lineTo(WORD_W, WORD_BASELINE - 70); ctx.stroke()
    ctx.setLineDash([])
    drawStrokes(ctx, strokes, liveStroke)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = WORD_W * dpr
    canvas.height = WORD_H * dpr
    canvas.getContext('2d')?.scale(dpr, dpr)
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { redraw() }, [strokes]) // eslint-disable-line react-hooks/exhaustive-deps

  function posFromEvent(e: React.PointerEvent): Point {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * (WORD_W / rect.width), y: (e.clientY - rect.top) * (WORD_H / rect.height) }
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%', aspectRatio: `${WORD_W} / ${WORD_H}`, borderRadius: '20px',
        background: '#fff', border: '1.5px solid var(--stone)', touchAction: 'none', display: 'block',
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

/* ── Word flow: write a word, pause, it slices and glides on — hands-free ── */

function WordFlow({ session, onSaved, glyphs }: {
  session: WordSession
  glyphs: GlyphStrokes
  onSaved: (merged: GlyphStrokes) => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [index, setIndex] = useState(0)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState('')
  const timerRef = useRef<number | null>(null)
  const glyphsRef = useRef(glyphs)
  glyphsRef.current = glyphs

  const word = session.words[index]
  const isSingleMark = word.length === 1

  // Never interrupt (Emerald, Oct 18): ~1.5s after the pen goes quiet the
  // word slices itself and the next one appears. Fix any oddballs later in
  // Fix-one-letter.
  const IDLE_MS = 1500

  function disarm() {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
  }
  useEffect(() => disarm, [])

  function onDraw(next: Stroke[]) {
    setStrokes(next)
    setError('')
    disarm()
    timerRef.current = window.setTimeout(() => finishWord(next, word, index), IDLE_MS)
  }

  async function finishWord(drawn: Stroke[], forWord: string, atIndex: number) {
    if (!drawn.length || saving) return
    setSaving(true)
    setError('')
    try {
      const result = segmentWord(drawn, forWord)
      const captured: GlyphStrokes = {}
      for (const letter of result.letters) {
        if (letter.strokes.length) captured[letter.char] = toGlyphSpace(letter.strokes, WORD_BASELINE)
      }
      const merged = await saveHandwritingProgress(glyphsRef.current, captured, `QuteNote-${user?.username ?? 'you'}-Handwriting`)
      onSaved(merged)
      setStrokes([])
      setFlash(forWord)
      window.setTimeout(() => setFlash(null), 900)
      if (atIndex + 1 < session.words.length) setIndex(atIndex + 1)
      else navigate('/handwriting', { replace: true })
    } catch {
      setError("That didn't save. Check your connection and write the word again.")
      setStrokes([])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 20px 60px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mid)', margin: 0 }}>
        {session.label} · {index + 1} of {session.words.length}
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isSingleMark ? '56px' : '44px', fontWeight: 400, color: 'var(--ink)', margin: '6px 0 2px' }}>
        {word}
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', margin: '0 0 14px' }}>
        {isSingleMark ? charName(session.key, word) : 'Write the whole word in one go, like you normally would.'}
      </p>

      <WordCanvas strokes={strokes} onDraw={onDraw} />
      <p style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', marginTop: '8px', minHeight: '18px' }}>
        {saving
          ? 'Saving…'
          : flash
            ? `✓ ${flash} saved`
            : strokes.length
              ? 'Pause when you\u2019re done — it moves on by itself.'
              : isSingleMark
                ? 'Just tap for a dot.'
                : 'Sit the word on the dashed line. Flow is good — that is the whole point.'}
      </p>

      {error && <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--error)', marginTop: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'center' }}>
        <button onClick={() => { disarm(); setStrokes([]) }} disabled={!strokes.length || saving}
          style={{
            height: '48px', borderRadius: '24px', border: '1.5px solid var(--stone)', cursor: 'pointer', padding: '0 26px',
            background: '#fff', color: 'var(--ink-mid)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
            letterSpacing: '0.08em', opacity: strokes.length && !saving ? 1 : 0.5,
          }}>
          Clear & rewrite
        </button>
      </div>
    </div>
  )
}


/* ── Touch-up: redo one single letter the old way ── */

function FixLetter({ char, glyphs, onSaved, onClose }: {
  char: string
  glyphs: GlyphStrokes
  onSaved: (merged: GlyphStrokes) => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const currentRef = useRef<Stroke>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [saving, setSaving] = useState(false)
  const S = HANDWRITING_CANVAS_SIZE

  function redraw(liveStroke?: Stroke) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, S, S)
    ctx.strokeStyle = '#E6E1DC'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, HANDWRITING_BASELINE_Y); ctx.lineTo(S, HANDWRITING_BASELINE_Y); ctx.stroke()
    ctx.setLineDash([])
    drawStrokes(ctx, strokes, liveStroke)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = S * dpr
    canvas.height = S * dpr
    canvas.getContext('2d')?.scale(dpr, dpr)
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { redraw() }, [strokes]) // eslint-disable-line react-hooks/exhaustive-deps

  function posFromEvent(e: React.PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * (S / rect.width), y: (e.clientY - rect.top) * (S / rect.height) }
  }

  const sessionKey = SESSIONS.find((s) => s.chars.includes(char))?.key ?? 'punctuation'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,56,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '22px 22px calc(26px + env(safe-area-inset-bottom))', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 400, margin: 0 }}>{char}</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)', margin: '0 0 12px' }}>{charName(sessionKey, char)} — redo just this one</p>
        <canvas
          ref={canvasRef}
          style={{ width: 'min(280px, 100%)', aspectRatio: '1', borderRadius: '20px', background: '#fff', border: '1.5px solid var(--stone)', touchAction: 'none', display: 'block', margin: '0 auto' }}
          onPointerDown={(e) => { e.preventDefault(); drawingRef.current = true; currentRef.current = [posFromEvent(e)]; canvasRef.current?.setPointerCapture(e.pointerId) }}
          onPointerMove={(e) => { if (!drawingRef.current) return; currentRef.current.push(posFromEvent(e)); redraw(currentRef.current) }}
          onPointerUp={() => { if (!drawingRef.current) return; drawingRef.current = false; if (currentRef.current.length >= 1) setStrokes([...strokes, currentRef.current]); currentRef.current = [] }}
          onPointerLeave={() => { if (!drawingRef.current) return; drawingRef.current = false; if (currentRef.current.length >= 1) setStrokes([...strokes, currentRef.current]); currentRef.current = [] }}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button onClick={() => setStrokes([])} disabled={!strokes.length} style={{
            flex: 1, height: '48px', borderRadius: '24px', border: '1.5px solid var(--stone)', background: '#fff',
            color: 'var(--ink-mid)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', opacity: strokes.length ? 1 : 0.5,
          }}>
            Clear
          </button>
          <button
            onClick={async () => {
              if (!strokes.length || saving) return
              setSaving(true)
              try {
                const merged = await saveHandwritingProgress(glyphs, { [char]: strokes }, `QuteNote-${user?.username ?? 'you'}-Handwriting`)
                onSaved(merged)
                onClose()
              } finally {
                setSaving(false)
              }
            }}
            disabled={!strokes.length || saving}
            style={{
              flex: 2, height: '48px', borderRadius: '24px', border: 'none', background: uv, color: '#fff',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
              opacity: !strokes.length || saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save letter'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Overview: pick a word session, see progress, touch up letters ── */

export default function HandwritingPage() {
  const navigate = useNavigate()
  const { sessionKey } = useParams()
  const { user } = useAuth()
  const [glyphs, setGlyphs] = useState<GlyphStrokes | null>(null)
  const [fixing, setFixing] = useState<string | null>(null)

  useEffect(() => {
    fetchHandwritingProgress().then((r) => {
      setGlyphs(r.glyphs)
      // Glyph processing improved since this font was saved? Recompile it once
      // from the stored strokes so old letters get the new polish automatically.
      const verKey = 'qn_hw_compiler_version'
      if (Object.keys(r.glyphs).length && Number(localStorage.getItem(verKey) ?? 0) < FONT_COMPILER_VERSION) {
        saveHandwritingProgress(r.glyphs, {}, `QuteNote-${user?.username ?? 'you'}-Handwriting`)
          .then(() => localStorage.setItem(verKey, String(FONT_COMPILER_VERSION)))
          .catch(() => {})
      }
    }).catch(() => setGlyphs({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeSession = WORD_SESSIONS.find((s) => s.key === sessionKey)

  const nav = (
    <nav style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <button onClick={() => { if (activeSession) navigate('/handwriting', { replace: true }); else navigate(-1) }} aria-label="Back" style={{
        width: '36px', height: '36px', borderRadius: '50%', background: 'var(--lavender-pale)',
        border: 'none', cursor: 'pointer', color: uv, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)' }}>Your handwriting</span>
    </nav>
  )

  if (activeSession) {
    if (glyphs === null) return null
    return (
      <div style={{ minHeight: '100vh' }}>
        {nav}
        <WordFlow key={activeSession.key} session={activeSession} glyphs={glyphs} onSaved={setGlyphs} />
      </div>
    )
  }

  const doneCount = glyphs ? ALL_CHARS.filter((c) => glyphs[c]?.length).length : 0
  const writtenChars = glyphs ? ALL_CHARS.filter((c) => glyphs[c]?.length) : []

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      {nav}

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', lineHeight: 1.5, marginBottom: '8px' }}>
          Write a few little words and QuteNote learns your real handwriting — flow and all — then turns it into your own font.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '22px' }}>
          {doneCount} of {TOTAL_CHARS} letters learned. Do it all now, or come back anytime. <span style={{ fontSize: '10px' }}>· build {WEB_BUILD || 'dev'}</span>
        </p>

        {WORD_SESSIONS.map((s) => {
          const sessionChars = SESSIONS.find((x) => x.key === s.key)?.chars ?? []
          const sessionDone = sessionChars.filter((c) => glyphs?.[c]?.length).length
          const complete = sessionDone === sessionChars.length
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
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)' }}>{s.detail} · {sessionDone} of {sessionChars.length} letters</div>
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

        {/* Touch-up: redo any single letter */}
        {writtenChars.length > 0 && (
          <div style={{ marginTop: '26px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--ink)', margin: '0 0 4px' }}>Fix one letter</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)', margin: '0 0 12px' }}>
              One came out funky? Tap it and redo just that one.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {writtenChars.map((c) => (
                <button key={c} onClick={() => setFixing(c)} style={{
                  width: '44px', height: '44px', borderRadius: '12px', background: '#fff',
                  border: '1px solid var(--stone)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: '18px', color: 'var(--ink)', textTransform: 'none', letterSpacing: 0, fontWeight: 400,
                }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {fixing && glyphs && (
        <FixLetter char={fixing} glyphs={glyphs} onSaved={setGlyphs} onClose={() => setFixing(null)} />
      )}
    </div>
  )
}
