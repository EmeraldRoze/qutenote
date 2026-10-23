import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { isNativeApp } from '../lib/native'
import { CARD_LOOKUP } from '../lib/cards'
import TabBar from '../components/TabBar'
import QEmoji from '../components/QEmoji'
import { trackFeature } from '../lib/analytics'

// The screen behind the QR on every printed card (Emerald, Oct 23).
// Scanning saves the card to your Received collection and offers:
// Reply · Decode my secret message · Listen to voice note — the last two
// grey themselves out when the card doesn't have one.

const uv = '#5A32D6'
const TESTFLIGHT_LINK = 'https://testflight.apple.com/join/BRW6MMEJ'

// If someone scans before they have an account, remember the card so the
// app can open it right after they sign in (HomePage checks this).
export const PENDING_SCAN_KEY = 'qn_pending_scan'

interface ScannedCard {
  id: string
  noteText: string
  fontChoice: string
  occasionType: string
  cardDesignId: string | null
  cardImageUrl: string | null
  voiceUploadId: string | null
  createdAt: string
  sender: { id: string; displayName: string; username: string }
  isOwn: boolean
}

const bigButton = (active: boolean, filled: boolean): React.CSSProperties => ({
  width: '100%', minHeight: '54px', borderRadius: '27px', cursor: active ? 'pointer' : 'default',
  border: filled ? 'none' : `1.5px solid ${active ? uv : 'var(--stone)'}`,
  background: filled ? uv : '#fff',
  color: filled ? '#fff' : active ? uv : 'var(--ink-muted)',
  opacity: active ? 1 : 0.55,
  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.08em',
})

export default function CardScanPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [card, setCard] = useState<ScannedCard | null>(null)
  const [error, setError] = useState('')
  const [decoded, setDecoded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (loading || !user || !code) return
    trackFeature('scan-card')
    api.get(`/cards/scan/${code}`)
      .then((r) => setCard(r.data.data))
      .catch((err) => setError(err.response?.data?.error ?? "Hmm, that card didn't load. Try scanning again."))
  }, [loading, user, code])

  useEffect(() => () => { audioRef.current?.pause() }, [])

  // ── Not signed in: the welcome-to-your-postcard landing ──
  if (!loading && !user) {
    return (
      <div style={{ minHeight: '100vh', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <QEmoji name="envelope" size={72} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)', margin: '18px 0 8px' }}>
            Someone mailed you a real one.
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', margin: '0 0 24px' }}>
            This card has a little more to it, like a reply button, maybe a secret message or a voice note. You need the QuteNote app (and a free account) to open it.
          </p>
          {!isNativeApp && (
            <>
              <a href={`qutenote://card/${code}`} style={{ ...bigButton(true, true), display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginBottom: '12px' }}>
                OPEN IN THE APP
              </a>
              <a href={TESTFLIGHT_LINK} style={{ ...bigButton(true, false), display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginBottom: '12px' }}>
                GET THE APP
              </a>
            </>
          )}
          <button
            onClick={() => {
              if (code) localStorage.setItem(PENDING_SCAN_KEY, JSON.stringify({ code, at: Date.now() }))
              navigate(isNativeApp ? '/welcome' : '/login')
            }}
            style={{ ...bigButton(true, isNativeApp), marginBottom: '4px' }}
          >
            {isNativeApp ? 'SIGN IN TO OPEN IT' : 'I HAVE AN ACCOUNT'}
          </button>
        </div>
      </div>
    )
  }

  if (loading || (!card && !error)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-muted)' }}>Opening your card…</p>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div>
          <QEmoji name="envelope" size={60} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', marginTop: '14px' }}>{error}</p>
        </div>
        <TabBar />
      </div>
    )
  }

  const design = CARD_LOOKUP[card.cardDesignId ?? '']
  const art = card.cardImageUrl ?? design?.art
  const hasSecret = card.fontChoice === 'SECRET' || card.fontChoice === 'FLOWER'
  const hasVoice = !!card.voiceUploadId
  const firstName = card.sender.displayName.split(' ')[0]

  function toggleVoice() {
    if (!hasVoice) return
    if (playing) { audioRef.current?.pause(); setPlaying(false); return }
    trackFeature('voice-listen')
    const a = new Audio(`${api.defaults.baseURL}/uploads/${card!.voiceUploadId}`)
    audioRef.current = a
    a.onended = () => setPlaying(false)
    a.onerror = () => { setPlaying(false); setError('') }
    a.play().catch(() => setPlaying(false))
    setPlaying(true)
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      <div className="title-band" style={{ height: '144px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '20px 20px 0' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            {card.isOwn ? 'Your card, in the flesh.' : 'You got a real one.'}
          </h1>
          <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)' }}>
            From {card.sender.displayName} · {new Date(card.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px' }}>
        {/* The card itself */}
        <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'center' }}>
          {art ? (
            <img src={art} alt={`The front of your card from ${card.sender.displayName}`} style={{
              maxHeight: '300px', maxWidth: '92%', width: 'auto', borderRadius: '6px',
              transform: 'rotate(-2deg)', boxShadow: '0 14px 28px rgba(35, 26, 58, 0.2)',
            }} />
          ) : (
            <div style={{
              height: '280px', width: '210px', borderRadius: '6px', background: design?.bg ?? 'var(--lavender-pale)',
              transform: 'rotate(-2deg)', boxShadow: '0 14px 28px rgba(35, 26, 58, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <QEmoji name="envelope" size={56} />
            </div>
          )}
        </div>

        {!card.isOwn && (
          <p style={{ margin: '16px 0 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
            Saved to the Received shelf on your profile 💌
          </p>
        )}

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            style={bigButton(true, true)}
            onClick={() => {
              trackFeature('reply-from-scan')
              navigate(`/send?toId=${card.sender.id}&toName=${encodeURIComponent(card.sender.displayName)}`)
            }}
          >
            REPLY TO {firstName.toUpperCase()}
          </button>

          <button
            style={bigButton(hasSecret, false)}
            disabled={!hasSecret}
            onClick={() => { if (!decoded) trackFeature('decode'); setDecoded((d) => !d) }}
          >
            {decoded ? 'HIDE IT AGAIN 🤫' : 'DECODE MY SECRET MESSAGE'}
          </button>

          <button style={bigButton(hasVoice, false)} disabled={!hasVoice} onClick={toggleVoice}>
            {playing ? '❚❚ PAUSE' : 'LISTEN TO VOICE NOTE'}
          </button>
        </div>

        {decoded && hasSecret && (
          <div style={{ marginTop: '16px', background: '#fff', border: '1.5px solid var(--stone)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: '18px', lineHeight: 1.7, color: 'var(--note-ink)', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
              {card.noteText}
            </p>
          </div>
        )}

        {playing && hasVoice && (
          <p aria-live="polite" style={{ margin: '12px 0 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '13px', color: uv }}>
            🎤 {firstName} is talking to you…
          </p>
        )}
      </div>

      <TabBar />
    </div>
  )
}
