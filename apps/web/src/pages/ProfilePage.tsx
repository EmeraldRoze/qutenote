import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { waxLetterSrc, WAX_CENTER_X, WAX_CENTER_Y, WAX_WIDTH } from '../lib/wax'
import QEmoji from '../components/QEmoji'
import TabBar from '../components/TabBar'
import StatusBox from '../components/StatusBox'
import { STATUS_EMOJI } from '../components/Happenings'
import { CARD_LOOKUP } from '../lib/cards'
import QRCodeSheet from '../components/QRCodeSheet'
import { penStyle } from '../lib/pens'
import { encodeSecret, SECRET_FONT_FAMILY } from '../lib/secret'
import FlowerText from '../components/FlowerText'
import { trackFeature } from '../lib/analytics'

// Profile tab, palette 4 restyle of screen 15-profile.html.
// Postmark-heart header with initials, status box, Sent/Received photo grid,
// cards-left box (free mode: no prices anywhere), stamp collection, address row.

// One collectible stamp earned per postcard sent, cycling the four designs
const STAMP_CYCLE = [
  '/stamps/stamp_cherries.png',
  '/stamps/stamp_rainbow.png',
  '/stamps/stamp_disco_ball.png',
  '/stamps/stamp_butterflies.png',
]
const STAMP_TILT = [-5, 4, -2, 5]

interface Badge { badgeType: string; earnedAt: string }
interface Profile {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  points: number
  currentStreak: number
  longestStreak: number
  isPrivate: boolean
  badges: Badge[]
  connectionStatus: string | null
  isMe: boolean
  _count: { notesSent: number; notesReceived: number; followers: number; following: number }
}
interface NoteThumb {
  id: string
  occasionType: string
  cardDesignId?: string | null
  cardImageUrl?: string | null
  createdAt: string
  noteText?: string
  fontChoice?: string
  voiceUploadId?: string | null
  sender?: { displayName: string; username: string }
  recipient?: { displayName: string; username: string }
}

const OCCASION_ART: Record<string, string> = {
  BIRTHDAY: 'cake', ANNIVERSARY: 'hearteyes', CONGRATULATIONS: 'popper', HOLIDAY: 'star',
  CONSOLATION: 'rainbow', JUST_BECAUSE: 'envelope', INVITATION: 'plane', CUSTOM: 'envelope',
}

// One letter for one-name people, first + last initial otherwise
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const actionTile: React.CSSProperties = {
  minHeight: '76px', borderRadius: '16px', border: '1.5px solid var(--stone)', background: 'var(--card)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer',
  textTransform: 'none', letterSpacing: 0, padding: '8px 4px',
}

// A received (or sent) card, opened from the grid. Secret-language cards
// show the cipher with a DECODE toggle, the message itself is the secret.
function CardSheet({ note, onClose }: { note: NoteThumb; onClose: () => void }) {
  const [decoded, setDecoded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => () => { audioRef.current?.pause() }, [])
  function toggleVoice() {
    if (playing) { audioRef.current?.pause(); setPlaying(false); return }
    trackFeature('voice-listen')
    const a = new Audio(`${api.defaults.baseURL}/uploads/${note.voiceUploadId}`)
    audioRef.current = a
    a.onended = () => setPlaying(false)
    a.play().catch(() => setPlaying(false))
    setPlaying(true)
  }
  const design = CARD_LOOKUP[note.cardDesignId ?? '']
  const isSecret = note.fontChoice === 'SECRET'
  const isFlower = note.fontChoice === 'FLOWER'
  const text = note.noteText ?? ''
  const shown = isSecret && !decoded ? encodeSecret(text) : text
  const penFont = isSecret && !decoded ? { fontFamily: SECRET_FONT_FAMILY, fontSize: '20px' } : penStyle(note.fontChoice)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(74,36,36,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', maxHeight: '86vh', overflowY: 'auto', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '20px 20px calc(26px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{
            aspectRatio: '3 / 2', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid var(--stone)',
            background: note.cardImageUrl
              ? `url(${note.cardImageUrl}) center/cover`
              : design?.art ? `url(${design.art}) center/cover` : design?.bg ?? 'var(--selected-fill)',
          }} />
          <div style={{ marginTop: '14px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '14px', padding: '16px' }}>
            {isFlower && !decoded ? (
              <FlowerText text={text} size={54} />
            ) : (
              <p style={{ margin: 0, ...penFont, lineHeight: 1.7, color: 'var(--note-ink)', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', filter: 'grayscale(1)' }}>
                {shown}
              </p>
            )}
          </div>
          {(isSecret || isFlower) && (
            <button onClick={() => { if (!decoded) trackFeature('decode'); setDecoded((d) => !d) }} style={{
              width: '100%', marginTop: '12px', height: '56px', borderRadius: '28px', border: '2px solid var(--stone)',
              background: 'var(--btn)', color: 'var(--ink)', cursor: 'pointer', boxSizing: 'border-box',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '15px', letterSpacing: '0.08em',
            }}>
              {decoded ? 'HIDE IT AGAIN 🤫' : 'DECODE THE SECRET'}
            </button>
          )}
          {note.voiceUploadId && (
            <button onClick={toggleVoice} style={{
              width: '100%', marginTop: '12px', height: '56px', borderRadius: '28px',
              border: '2px solid var(--stone)', background: 'var(--card)', color: 'var(--ink)', cursor: 'pointer', boxSizing: 'border-box',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '15px', letterSpacing: '0.08em',
            }}>
              {playing ? '❚❚ PAUSE' : '🎤 LISTEN TO VOICE NOTE'}
            </button>
          )}
          <p style={{ margin: '12px 0 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
            {note.sender ? `From ${note.sender.displayName}` : note.recipient ? `To ${note.recipient.displayName}` : ''} · {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser, logout } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'sent' | 'received'>('sent')
  const [sent, setSent] = useState<NoteThumb[]>([])
  const [received, setReceived] = useState<NoteThumb[]>([])
  const [requested, setRequested] = useState(false)
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showAllStamps, setShowAllStamps] = useState(false)
  const [openCard, setOpenCard] = useState<NoteThumb | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get(`/users/${username}`)
      .then((res) => setProfile(res.data.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [username])

  const isMe = profile?.isMe ?? (user?.username === username)

  useEffect(() => {
    if (!isMe) return
    api.get('/notes/sent').then((r) => setSent(r.data.data)).catch(() => {})
    api.get('/notes/received').then((r) => setReceived(r.data.data)).catch(() => {})
  }, [isMe])

  async function addQT() {
    if (!profile) return
    await api.post(`/connections/request/${profile.id}`)
    setRequested(true)
  }

  // Removing a QT: two taps so a stray touch can't end a friendship.
  const [removeArmed, setRemoveArmed] = useState(false)
  async function removeQT() {
    if (!profile) return
    if (!removeArmed) { setRemoveArmed(true); setTimeout(() => setRemoveArmed(false), 4000); return }
    await api.delete(`/connections/${profile.id}`)
    setRemoveArmed(false)
    setRequested(false)
    setProfile({ ...profile, connectionStatus: null })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-muted)' }}>One sec…</p>
        <TabBar />
      </div>
    )
  }
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-muted)' }}>No one by that name here.</p>
        <TabBar />
      </div>
    )
  }

  const notes = tab === 'sent' ? sent : received
  const cardsLeft = user ? Math.max(0, (user.notesAllowance ?? 0) + (user.giftedCredits ?? 0) - (user.notesUsed ?? 0)) : 0
  const renewDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  const renewLabel = `Renews ${renewDate.toLocaleDateString('en-US', { month: 'short' })} 1`
  const stampsEarned = sent.length
  const stampsShown = showAllStamps ? stampsEarned : Math.min(stampsEarned, 4)

  function cardFace(n: NoteThumb): React.CSSProperties {
    const design = CARD_LOOKUP[n.cardDesignId ?? '']
    return {
      background: n.cardImageUrl
        ? `url(${n.cardImageUrl}) center/cover`
        : design?.art
          ? `url(${design.art}) center/cover`
          : design?.bg ?? 'var(--selected-fill)',
    }
  }

  if (isMe) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>

        {/* ── Title band: postmark heart, initials, name ── */}
        <div className="title-band" style={{ height: '360px', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {/* QR sits with notifications and settings now (Emerald, Oct 24) */}
              <button onClick={() => setShowQR(true)} aria-label="Show my QR code" style={{
                width: '44px', height: '44px', borderRadius: '50%', background: 'var(--card)', color: 'var(--ink)',
                boxSizing: 'border-box', border: '1.5px solid var(--stone)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3.5" y="3.5" width="6" height="6" rx="1" /><rect x="14.5" y="3.5" width="6" height="6" rx="1" /><rect x="3.5" y="14.5" width="6" height="6" rx="1" /><path d="M14.5 14.5h2v2h-2zM18.5 18.5h2v2h-2z" /></svg>
              </button>
              <button onClick={() => navigate('/settings/notifications')} aria-label="Notifications" style={{
                width: '44px', height: '44px', borderRadius: '50%', background: 'var(--card)', color: 'var(--ink)',
                boxSizing: 'border-box', border: '1.5px solid var(--stone)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
              </button>
              <button onClick={() => navigate('/settings')} aria-label="Settings" style={{
                width: '44px', height: '44px', borderRadius: '50%', background: 'var(--card)', color: 'var(--ink)',
                boxSizing: 'border-box', border: '1.5px solid var(--stone)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ position: 'relative', width: '290px', height: '174px', transform: 'translateX(71px) rotate(-4deg)' }}>
                <img src="/brand/postmark_stamp_heartless.png" alt="" style={{ width: '290px', height: 'auto', display: 'block' }} />
                {/* her wax seal alphabet: the first initial pressed into the wax */}
                <img src={waxLetterSrc(profile.displayName)} alt={`Wax seal with the initial ${initialsOf(profile.displayName)[0]}`} style={{
                  position: 'absolute', left: `${290 * WAX_CENTER_X}px`, top: `${290 * WAX_CENTER_Y}px`,
                  width: `${Math.round(290 * WAX_WIDTH)}px`, transform: 'translate(-50%, -50%)',
                }} />
                {/* the + emoji-picker button is gone (Emerald, Oct 23);
                    picking an avatar emoji still lives on Account (Deets) */}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '-0.01em', color: 'var(--ink)' }}>{profile.displayName}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)' }}>@{profile.username}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px' }}>

          {/* Editable status box */}
          <div style={{ marginTop: '14px' }}>
            <StatusBox onPosted={() => refreshUser?.()} />
          </div>

          {/* Add friends / Invite / Handwriting */}
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            <button onClick={() => navigate('/connections')} style={actionTile}>
              <QEmoji name="bff" size={48} />
              Add friends
            </button>
            <button onClick={() => navigate('/invite')} style={{ ...actionTile, whiteSpace: 'pre-line' }}>
              <QEmoji name="gift" size={30} />
              {'Invite friends,\nget free cards.'}
            </button>
            <button onClick={() => navigate('/handwriting')} style={actionTile}>
              <QEmoji name="pen" size={32} />
              Handwriting
            </button>
          </div>

          {/* Sent / Received segmented control */}
          <div role="tablist" aria-label="Your cards" style={{
            marginTop: '20px', height: '48px', borderRadius: '24px', background: 'var(--light-blush)',
            padding: '4px', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          }}>
            <button role="tab" aria-selected={tab === 'sent'} onClick={() => setTab('sent')} style={{
              border: 0, borderRadius: '20px', background: tab === 'sent' ? 'var(--card)' : 'transparent',
              fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              color: 'var(--ink)', textTransform: 'none', letterSpacing: 0,
            }}>Sent</button>
            <button role="tab" aria-selected={tab === 'received'} onClick={() => setTab('received')} style={{
              border: 0, borderRadius: '20px', background: tab === 'received' ? 'var(--card)' : 'transparent',
              fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              color: 'var(--ink)', textTransform: 'none', letterSpacing: 0,
            }}>Received</button>
          </div>

          {/* 3-column photo grid of real cards */}
          {notes.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)', padding: '14px 0 4px' }}>
              {tab === 'sent' ? 'None sent yet.' : 'None received yet.'}
            </p>
          ) : (
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '4px' }}>
              {notes.map((n, i) => (
                <button key={n.id} aria-label={`${tab === 'sent' ? 'Sent' : 'Received'} card ${i + 1}, open`} onClick={() => setOpenCard(n)} style={{
                  aspectRatio: '1 / 1', borderRadius: '6px', overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...cardFace(n),
                }}>
                  {!n.cardImageUrl && !CARD_LOOKUP[n.cardDesignId ?? '']?.art && (
                    <QEmoji name={OCCASION_ART[n.occasionType] ?? 'envelope'} size={52} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Left this month, free mode: no prices */}
          <div style={{ marginTop: '16px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '22px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)' }}>Left this month</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>{renewLabel}</span>
            </div>
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '34px', lineHeight: 1, color: 'var(--ink)' }}>{cardsLeft}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>cards</span>
            </div>
            <button onClick={() => navigate('/send')} style={{
              marginTop: '18px', width: '100%', height: '56px', borderRadius: '28px', border: '2px solid var(--stone)',
              background: 'var(--btn)', color: 'var(--ink)', cursor: 'pointer', boxSizing: 'border-box',
              fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em',
            }}>SEND A CARD</button>
          </div>

          {/* Stamp collection, one stamp per postcard sent */}
          <div style={{ marginTop: '16px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '22px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>Your stamp collection</span>
              {stampsEarned > 0 && (
                <button onClick={() => setShowAllStamps((s) => !s)} style={{
                  border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--stamp-center)',
                  textTransform: 'none', letterSpacing: 0,
                }}>{showAllStamps ? 'Show fewer' : `See all ${stampsEarned}`}</button>
              )}
            </div>
            {stampsEarned === 0 ? (
              <p style={{ margin: '12px 0 4px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>
                Empty for now. Every card you mail earns a stamp, someone came to mind, didn’t they?
              </p>
            ) : (
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: showAllStamps ? 'wrap' : 'nowrap', overflow: 'hidden' }}>
                {Array.from({ length: stampsShown }).map((_, i) => (
                  <img key={i} src={STAMP_CYCLE[i % 4]} alt={`Stamp ${i + 1}`} style={{
                    width: '58px', height: 'auto', flex: 'none',
                    transform: `rotate(${STAMP_TILT[i % 4]}deg)`,
                    filter: 'drop-shadow(0 3px 5px rgba(74, 36, 36, 0.15))',
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Your address */}
          <div style={{ marginTop: '16px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '22px', overflow: 'hidden' }}>
            <button onClick={() => navigate('/settings/address')} style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', minHeight: '60px',
              padding: '0 18px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
              textTransform: 'none', letterSpacing: 0,
            }}>
              <QEmoji name="house" size={32} />
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>Your address</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', fontWeight: 400 }}>Hidden from senders</span>
            </button>
          </div>

          {/* Log out, at the end of your own profile, per Emerald */}
          <button
            onClick={() => { logout(); navigate('/') }}
            style={{
              width: '100%', marginTop: '22px', minHeight: '48px', border: 'none', background: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700,
              color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: '3px',
              textTransform: 'none', letterSpacing: 0,
            }}
          >
            Log out
          </button>
        </div>

        {showQR && <QRCodeSheet username={profile.username} onClose={() => setShowQR(false)} />}
        {openCard && <CardSheet note={openCard} onClose={() => setOpenCard(null)} />}

        {pickingAvatar && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(74,36,36,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setPickingAvatar(false)}>
            <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 300, marginBottom: '14px' }}>Pick your emoji</h2>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {STATUS_EMOJI.map((e) => (
                  <button key={e} onClick={async () => {
                    await api.put('/users/me', { avatarUrl: `/emoji/${e}.png` })
                    setProfile((p) => (p ? { ...p, avatarUrl: `/emoji/${e}.png` } : p))
                    refreshUser?.()
                    setPickingAvatar(false)
                  }} style={{
                    width: '52px', height: '52px', borderRadius: '26px', cursor: 'pointer',
                    background: 'var(--card)', border: '1.5px solid var(--stone)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <QEmoji name={e} size={32} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <TabBar />
      </div>
    )
  }

  // Someone else's profile: simpler centered layout
  const stampsTheyEarned = profile._count.notesSent

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      <div className="title-band" style={{ height: '288px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '14px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '230px', height: '138px', transform: 'translateX(56px) rotate(-4deg)' }}>
            <img src="/brand/postmark_stamp_heartless.png" alt="" style={{ width: '230px', height: 'auto', display: 'block' }} />
            <img src={waxLetterSrc(profile.displayName)} alt={`Wax seal with the initial ${initialsOf(profile.displayName)[0]}`} style={{
              position: 'absolute', left: `${230 * WAX_CENTER_X}px`, top: `${230 * WAX_CENTER_Y}px`,
              width: `${Math.round(230 * WAX_WIDTH)}px`, transform: 'translate(-50%, -50%)',
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '-0.01em', color: 'var(--ink)' }}>{profile.displayName}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)' }}>@{profile.username}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box', padding: '0 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {profile.bio && <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', marginTop: '14px', textAlign: 'center' }}>{profile.bio}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={addQT}
              disabled={requested || profile.connectionStatus === 'ACCEPTED' || profile.connectionStatus === 'PENDING'}
              style={{
                height: '44px', padding: '0 20px', borderRadius: '999px', cursor: 'pointer',
                border: '2px solid var(--stone)', boxSizing: 'border-box',
                background: profile.connectionStatus === 'ACCEPTED' ? 'var(--selected-fill)' : 'var(--btn)',
                color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em',
              }}
            >
              {profile.connectionStatus === 'ACCEPTED' ? 'Your QT ✓' : requested || profile.connectionStatus === 'PENDING' ? 'Requested' : 'Add QT'}
            </button>
            {profile.connectionStatus === 'ACCEPTED' && (
              <button
                onClick={removeQT}
                style={{
                  height: '44px', padding: '0 16px', borderRadius: '999px', cursor: 'pointer',
                  border: `2px solid ${removeArmed ? 'var(--error)' : 'var(--stone)'}`, boxSizing: 'border-box',
                  background: removeArmed ? 'var(--error-pale)' : 'var(--card)',
                  color: removeArmed ? 'var(--error)' : 'var(--ink)',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em',
                }}
              >
                {removeArmed ? 'Tap again to remove' : 'Remove QT'}
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', width: '100%', marginTop: '20px',
            background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '22px',
            padding: '16px 0', textAlign: 'center',
          }}>
            <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--ink)' }}>{profile._count.notesSent}</div><div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>cards sent</div></div>
            <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--ink)' }}>{profile._count.notesReceived}</div><div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>cards received</div></div>
            <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--ink)' }}>{profile._count.following}</div><div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>QTs</div></div>
          </div>

          {/* Their stamp collection, one per card sent */}
          <div style={{ width: '100%', boxSizing: 'border-box', marginTop: '16px', background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '22px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>Stamp collection</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>{stampsTheyEarned} collected</span>
            </div>
            {stampsTheyEarned === 0 ? (
              <p style={{ margin: '12px 0 4px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>
                No stamps yet.
              </p>
            ) : (
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', overflow: 'hidden' }}>
                {Array.from({ length: Math.min(stampsTheyEarned, 4) }).map((_, i) => (
                  <img key={i} src={STAMP_CYCLE[i % 4]} alt={`Stamp ${i + 1}`} style={{
                    width: '58px', height: 'auto', flex: 'none',
                    transform: `rotate(${STAMP_TILT[i % 4]}deg)`,
                    filter: 'drop-shadow(0 3px 5px rgba(74, 36, 36, 0.15))',
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <TabBar />
    </div>
  )
}
