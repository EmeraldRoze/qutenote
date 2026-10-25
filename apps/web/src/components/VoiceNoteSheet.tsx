import { useEffect, useRef, useState } from 'react'

// Record a voice note for a card (Emerald, Oct 23): the recipient scans the
// QR on the printed card and hears it. Max 60 seconds. The audio stays in
// memory as a data URL until MAIL IT uploads it with the note.

const MAX_SECONDS = 60

export interface VoiceNote {
  dataUrl: string
  duration: number // seconds
}

export function formatSeconds(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// WKWebView records audio/mp4; desktop browsers audio/webm. Pick what works.
function pickMime(): string {
  for (const m of ['audio/mp4', 'audio/webm', 'audio/mpeg']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m
  }
  return ''
}

async function blobToDataUrl(blob: Blob, mime: string): Promise<string> {
  const raw: string = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
  // Normalize "audio/mp4;codecs=..." to the plain mime the server expects
  return `data:${mime};base64,${raw.slice(raw.indexOf(',') + 1)}`
}

export default function VoiceNoteSheet({ onDone, onClose }: {
  onDone: (v: VoiceNote) => void
  onClose: () => void
}) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'recorded'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const takeRef = useRef<VoiceNote | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    recorderRef.current = null
    audioRef.current?.pause()
  }
  useEffect(() => cleanup, [])

  async function startRecording() {
    setError('')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError("QuteNote can't hear you. Allow the microphone in Settings and try again.")
      return
    }
    const mime = pickMime()
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    recorderRef.current = rec
    chunksRef.current = []
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    rec.onstop = async () => {
      const baseMime = (rec.mimeType || mime || 'audio/mp4').split(';')[0]
      const blob = new Blob(chunksRef.current, { type: baseMime })
      stream.getTracks().forEach((t) => t.stop())
      if (blob.size === 0) { setPhase('idle'); setError("Nothing recorded, give it another go."); return }
      const dataUrl = await blobToDataUrl(blob, baseMime)
      takeRef.current = { dataUrl, duration: secondsRef.current }
      setPhase('recorded')
    }
    rec.start()
    setPhase('recording')
    setSeconds(0)
    secondsRef.current = 0
    timerRef.current = setInterval(() => {
      secondsRef.current += 1
      setSeconds(secondsRef.current)
      if (secondsRef.current >= MAX_SECONDS) stopRecording()
    }, 1000)
  }
  const secondsRef = useRef(0)

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  function togglePlay() {
    const take = takeRef.current
    if (!take) return
    if (playing) { audioRef.current?.pause(); setPlaying(false); return }
    const a = new Audio(take.dataUrl)
    audioRef.current = a
    a.onended = () => setPlaying(false)
    a.play().catch(() => setError("Couldn't play that back."))
    setPlaying(true)
  }

  const bigRound = (bg: string, border?: string): React.CSSProperties => ({
    width: '84px', height: '84px', borderRadius: '50%', border: border ?? 'none', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    margin: '0 auto',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(74,36,36,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => { cleanup(); onClose() }}>
      <div style={{ width: '100%', background: 'var(--cream)', borderTop: '2px solid var(--outline)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(28px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '22px', color: 'var(--ink)', margin: '0 0 6px' }}>
            {phase === 'recorded' ? 'How does it sound?' : 'Say it out loud'}
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', margin: '0 0 20px' }}>
            {phase === 'recorded'
              ? 'They hear it when they scan the little code on the card.'
              : 'Up to 60 seconds. They scan the card to hear you.'}
          </p>

          {phase === 'idle' && (
            <button aria-label="Start recording" onClick={startRecording} style={{ ...bigRound('var(--card)', '2px solid var(--outline)'), width: '96px', height: '96px' }}>
              <img src="/emoji/mic.png" alt="" style={{ width: '58px', height: 'auto' }} />
            </button>
          )}

          {phase === 'recording' && (
            <>
              <button aria-label="Stop recording" onClick={stopRecording} style={bigRound('var(--error)', '2px solid var(--outline)')}>
                <svg aria-hidden width="30" height="30" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="var(--card)" /></svg>
              </button>
              <p aria-live="polite" style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: '14px 0 0' }}>
                {formatSeconds(seconds)} <span style={{ fontWeight: 400, color: 'var(--ink-mid)' }}>/ 1:00</span>
              </p>
            </>
          )}

          {phase === 'recorded' && (
            <>
              <button aria-label={playing ? 'Pause' : 'Play it back'} onClick={togglePlay} style={bigRound('var(--card)', '2px solid var(--outline)')}>
                {playing ? (
                  <svg aria-hidden width="30" height="30" viewBox="0 0 24 24" fill="var(--ink)"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
                ) : (
                  <svg aria-hidden width="30" height="30" viewBox="0 0 24 24" fill="var(--ink)"><path d="M8 5.5v13l11-6.5z" /></svg>
                )}
              </button>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', margin: '12px 0 0' }}>
                {formatSeconds(takeRef.current?.duration ?? 0)} recorded
              </p>
              <div className="qn-actions" style={{ marginTop: '18px' }}>
                <button onClick={() => { if (takeRef.current) { cleanup(); onDone(takeRef.current) } }}
                  className="qn-stamp qn-action" style={{ ['--qn-panel' as string]: 'var(--btn)' }}>
                  PUT IT ON THE CARD
                </button>
                <button onClick={() => { takeRef.current = null; setPhase('idle'); setSeconds(0) }}
                  className="qn-stamp qn-action qn-action-sm">
                  RECORD IT AGAIN
                </button>
              </div>
            </>
          )}

          {error && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--error)', margin: '14px 0 0' }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
