import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'
import TabBar from '../components/TabBar'
import { HappeningsRow, STATUS_EMOJI } from '../components/Happenings'
import { CARD_LOOKUP } from '../lib/cards'

const OVERAGE_PRICE = '$3.49' // real Stripe price — mockup showed a placeholder $2.95

// Profile — App Screens board layout in the Oct 2026 system:
// membership card, stats, privacy, handwriting teaser, stamp book, postcards.

const uv = '#5A32D6'
const sectionTitle: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, letterSpacing: '-0.01em', color: 'var(--ink)' }

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
}

// Badges render as stamps in the stamp book
const STAMPS: Record<string, { label: string; art: string; bg: string }> = {
  FIRST_NOTE: { label: 'First note', art: 'envelope', bg: 'var(--lavender-pale)' },
  BIRTHDAY_HERO: { label: 'Birthday hero', art: 'cake', bg: '#F9E8EF' },
  ON_A_ROLL: { label: 'On a roll', art: 'popper', bg: '#FDF3DC' },
  KINDNESS_MACHINE: { label: 'Kindness machine', art: 'heart', bg: '#FBEAEA' },
  PASS_IT_FORWARD: { label: 'Pass it forward', art: 'gift', bg: '#EAF2FB' },
  CONNECTED: { label: 'Connected', art: 'clover', bg: '#EDF5E4' },
  THOUGHTFUL_FRIEND: { label: 'Thoughtful friend', art: 'flower', bg: 'var(--lavender-pale)' },
  HOLIDAY_SPIRIT: { label: 'Holiday spirit', art: 'star', bg: '#FDF3DC' },
}

const OCCASION_ART: Record<string, string> = {
  BIRTHDAY: 'cake', ANNIVERSARY: 'hearteyes', CONGRATULATIONS: 'popper', HOLIDAY: 'star',
  CONSOLATION: 'rainbow', JUST_BECAUSE: 'envelope', INVITATION: 'plane', CUSTOM: 'envelope',
}

export default function ProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'sent' | 'received'>('sent')
  const [sent, setSent] = useState<NoteThumb[]>([])
  const [received, setReceived] = useState<NoteThumb[]>([])
  const [requested, setRequested] = useState(false)
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const [showQR, setShowQR] = useState(false)

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

  async function togglePrivacy() {
    await api.post('/connections/privacy', { isPrivate: !user?.isPrivate })
    refreshUser?.()
    setProfile((p) => (p ? { ...p, isPrivate: !p.isPrivate } : p))
  }

  async function addQT() {
    if (!profile) return
    await api.post(`/connections/request/${profile.id}`)
    setRequested(true)
  }

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

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
  const earned = profile.badges.map((b) => b.badgeType).filter((t) => STAMPS[t])

  const cardsLeft = user ? Math.max(0, (user.notesAllowance ?? 0) + (user.giftedCredits ?? 0) - (user.notesUsed ?? 0)) : 0
  const cardsTotal = user ? (user.notesAllowance ?? 0) + (user.giftedCredits ?? 0) : 0
  const totalStampTypes = Object.keys(STAMPS).length

  if (isMe) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '110px' }}>
        {/* Purple header */}
        <div style={{ background: uv, borderRadius: '0 0 32px 32px', padding: '24px 24px 54px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#fff', letterSpacing: '-0.01em' }}>{profile.displayName}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>@{profile.username}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span aria-hidden style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              </span>
              <button onClick={() => navigate('/settings')} aria-label="Settings" style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.14.54.5.99 1 1.21.14.06.3.09.46.1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 24px' }}>
          {/* Avatar overlapping the header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-40px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '96px', height: '96px', borderRadius: '48px', background: 'var(--lavender-light)',
                border: '3px solid #fff', boxShadow: '0 4px 14px rgba(43,34,56,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: '28px', color: uv, overflow: 'hidden',
              }}>
                {profile.avatarUrl?.startsWith('/emoji/')
                  ? <QEmoji name={profile.avatarUrl.replace('/emoji/', '').replace('.png', '')} size={62} />
                  : profile.avatarUrl
                    ? <img src={profile.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(profile.displayName)}
              </div>
              <button onClick={() => setPickingAvatar(true)} aria-label="Pick your profile emoji" style={{
                position: 'absolute', top: '-4px', left: '-4px', width: '30px', height: '30px', borderRadius: '15px',
                border: '2px solid #fff', background: uv, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(43,34,56,0.2)',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <button onClick={() => setShowQR(true)} aria-label="Your QR code" style={{
                position: 'absolute', bottom: '-4px', right: '-4px', width: '30px', height: '30px', borderRadius: '15px',
                border: '2px solid #fff', background: '#fff', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(43,34,56,0.2)',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={uv} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M21 14v3h-3M14 21h3" /></svg>
              </button>
            </div>
            {profile.bio && <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', marginTop: '10px', textAlign: 'center' }}>{profile.bio}</p>}

            <div style={{ width: '100%', marginTop: '16px' }}><HappeningsRow /></div>

            {/* Add friends / Invite / Handwriting */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%', marginTop: '14px' }}>
              <button onClick={() => navigate('/connections')} style={{ padding: '14px 8px', borderRadius: '16px', background: '#fff', border: '1px solid var(--stone)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <QEmoji name="bff" size={30} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)', textTransform: 'none', letterSpacing: 0, textAlign: 'center' }}>Add friends</span>
              </button>
              <button onClick={() => navigate('/invite')} style={{ padding: '14px 8px', borderRadius: '16px', background: '#fff', border: '1px solid var(--stone)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <QEmoji name="envelope" size={30} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)', textTransform: 'none', letterSpacing: 0, textAlign: 'center' }}>Invite, get a card</span>
              </button>
              <button onClick={() => navigate('/handwriting')} style={{ padding: '14px 8px', borderRadius: '16px', background: '#fff', border: '1px solid var(--stone)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <QEmoji name="pen" size={30} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink)', textTransform: 'none', letterSpacing: 0, textAlign: 'center' }}>Handwriting</span>
              </button>
            </div>

            {/* Privacy */}
            <div style={{ width: '100%', marginTop: '14px', padding: '14px 16px', boxSizing: 'border-box', borderRadius: '14px', background: '#fff', border: '1px solid var(--stone)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700 }}>Who sees your sends</span>
                <span style={{ display: 'flex', padding: '3px', borderRadius: '10px', background: 'var(--lavender-pale)' }}>
                  <button onClick={() => user?.isPrivate || togglePrivacy()} style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', background: user?.isPrivate ? '#fff' : 'transparent', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink)', cursor: 'pointer' }}>Private</button>
                  <button onClick={() => user?.isPrivate && togglePrivacy()} style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', background: user?.isPrivate ? 'transparent' : '#fff', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink)', cursor: 'pointer' }}>Public</button>
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.45, color: 'var(--ink-mid)' }}>
                {user?.isPrivate
                  ? 'Private: your sends stay off feeds, and only you can see the cards you sent.'
                  : "Public: your sends show on your QTs' feeds and on your profile. Messages are never shown."}
              </div>
            </div>

            {/* Sent / Received grid */}
            <div id="postcards" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', margin: '26px 0 12px' }}>
              <div style={sectionTitle}>Your Postcards</div>
              <span style={{ display: 'flex', padding: '3px', borderRadius: '10px', background: 'var(--lavender-pale)' }}>
                <button onClick={() => setTab('sent')} style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', background: tab === 'sent' ? '#fff' : 'transparent', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink)', cursor: 'pointer' }}>Sent</button>
                <button onClick={() => setTab('received')} style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', background: tab === 'received' ? '#fff' : 'transparent', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink)', cursor: 'pointer' }}>Received</button>
              </span>
            </div>
            {tab === 'sent' && user?.isPrivate && (
              <div style={{ width: '100%', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)', marginBottom: '10px' }}>
                Only you can see your sent cards.
              </div>
            )}
            {notes.length === 0 ? (
              <p style={{ width: '100%', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)', padding: '10px 0 20px' }}>
                {tab === 'sent' ? 'Nothing sent yet. Someone came to mind, didn’t they?' : 'No postcards received yet.'}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' }}>
                {notes.map((n) => (
                  <div key={n.id} style={{
                    height: '96px', borderRadius: '8px', border: '4px solid #fff',
                    boxShadow: '0 2px 8px rgba(43,34,56,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: n.cardImageUrl
                      ? `url(${n.cardImageUrl}) center/cover`
                      : CARD_LOOKUP[n.cardDesignId ?? '']?.art
                        ? `url(${CARD_LOOKUP[n.cardDesignId ?? ''].art}) center/cover`
                        : CARD_LOOKUP[n.cardDesignId ?? '']?.bg ?? 'var(--lavender-pale)',
                  }}>
                    {!n.cardImageUrl && !CARD_LOOKUP[n.cardDesignId ?? '']?.art && (
                      <QEmoji name={OCCASION_ART[n.occasionType] ?? 'envelope'} size={48} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Left this month */}
            <div style={{ width: '100%', boxSizing: 'border-box', marginTop: '22px', padding: '16px', borderRadius: '18px', background: '#fff', border: '1px solid var(--stone)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>Left this month</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--ink)', margin: '2px 0 12px' }}>
                {user?.subscriptionStatus === 'ACTIVE' ? cardsLeft : 0} <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 400, color: 'var(--ink-mid)' }}>of {user?.subscriptionStatus === 'ACTIVE' ? cardsTotal : 2} cards</span>
              </div>
              <button onClick={() => navigate(user?.subscriptionStatus === 'ACTIVE' ? '/send' : '/subscribe')} style={{
                width: '100%', height: '46px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700,
                fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>{user?.subscriptionStatus === 'ACTIVE' ? 'Send a card' : 'Join for $7.95/mo'}</button>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-muted)', textAlign: 'center', marginTop: '10px' }}>
                Extra cards are {OVERAGE_PRICE} each
              </p>
            </div>

            {/* Stamp collection */}
            <div style={{ width: '100%', boxSizing: 'border-box', marginTop: '14px', padding: '16px', borderRadius: '18px', background: '#fff', border: '1px solid var(--stone)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>Your stamp collection</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)' }}>{earned.length} of {totalStampTypes}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {earned.slice(0, 4).map((t) => (
                  <span key={t} style={{ width: '48px', height: '48px', borderRadius: '10px', border: `2px dashed var(--lavender-soft)`, background: STAMPS[t].bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QEmoji name={STAMPS[t].art} size={26} />
                  </span>
                ))}
                {Array.from({ length: Math.max(0, 4 - earned.length) }).map((_, i) => (
                  <span key={i} style={{ width: '48px', height: '48px', borderRadius: '10px', border: '2px dashed var(--lavender-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lavender-light)', fontSize: '16px' }}>?</span>
                ))}
              </div>
            </div>

            {/* Address */}
            <button onClick={() => navigate('/address')} style={{
              display: 'flex', alignItems: 'center', gap: '14px', width: '100%', boxSizing: 'border-box',
              marginTop: '14px', marginBottom: '20px', padding: '14px 16px', borderRadius: '18px', background: '#fff',
              border: '1px solid var(--stone)', cursor: 'pointer', textAlign: 'left',
            }}>
              <QEmoji name="house" size={32} />
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>Your address</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>Hidden from senders</span>
            </button>
          </div>
        </div>

        {showQR && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,56,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowQR(false)}>
            <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, marginBottom: '10px' }}>Add in person</h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', marginBottom: '16px' }}>
                Scanning isn't live yet — send them your link instead.
              </p>
              <div style={{ padding: '14px', background: '#fff', borderRadius: '14px', border: '1px solid var(--stone)', fontFamily: 'var(--font-body)', fontSize: '14px', color: uv, marginBottom: '14px', wordBreak: 'break-all' }}>
                qutenote.com/profile/{profile.username}
              </div>
              <button onClick={() => { navigator.clipboard?.writeText(`https://qutenote.com/profile/${profile.username}`); setShowQR(false) }} style={{
                width: '100%', height: '48px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>Copy link</button>
            </div>
          </div>
        )}

        {pickingAvatar && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,56,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setPickingAvatar(false)}>
            <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, marginBottom: '14px' }}>Pick your emoji</h2>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {STATUS_EMOJI.map((e) => (
                  <button key={e} onClick={async () => {
                    await api.put('/users/me', { avatarUrl: `/emoji/${e}.png` })
                    setProfile((p) => (p ? { ...p, avatarUrl: `/emoji/${e}.png` } : p))
                    refreshUser?.()
                    setPickingAvatar(false)
                  }} style={{
                    width: '52px', height: '52px', borderRadius: '26px', cursor: 'pointer',
                    background: '#fff', border: '1px solid var(--stone)',
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

  // ── Someone else's profile: simpler centered layout ──
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '110px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '48px', background: 'var(--lavender-light)',
            border: '3px solid #fff', boxShadow: '0 4px 14px rgba(43,34,56,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '28px', color: uv, overflow: 'hidden',
          }}>
            {profile.avatarUrl?.startsWith('/emoji/')
              ? <QEmoji name={profile.avatarUrl.replace('/emoji/', '').replace('.png', '')} size={62} />
              : profile.avatarUrl
                ? <img src={profile.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials(profile.displayName)}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginTop: '10px', letterSpacing: '-0.01em' }}>{profile.displayName}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)' }}>@{profile.username}</div>
          {profile.bio && <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', marginTop: '6px', textAlign: 'center' }}>{profile.bio}</p>}

          <button
            onClick={addQT}
            disabled={requested || profile.connectionStatus === 'ACCEPTED' || profile.connectionStatus === 'PENDING'}
            style={{
              marginTop: '12px', height: '40px', padding: '0 18px', borderRadius: '999px', cursor: 'pointer',
              border: `1.5px solid ${uv}`,
              background: profile.connectionStatus === 'ACCEPTED' ? 'var(--lavender-pale)' : '#fff',
              color: uv, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', letterSpacing: '0.12em',
            }}
          >
            {profile.connectionStatus === 'ACCEPTED' ? 'Your QT' : requested || profile.connectionStatus === 'PENDING' ? 'Requested' : 'Add QT'}
          </button>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', width: '100%', marginTop: '16px',
            padding: '14px 0', borderTop: '1px solid var(--stone)', borderBottom: '1px solid var(--stone)', textAlign: 'center',
          }}>
            <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--ink)' }}>{profile._count.notesSent}</div><div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>cards sent</div></div>
            <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--ink)' }}>{profile._count.notesReceived}</div><div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>cards received</div></div>
            <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '22px' }}>{profile._count.following}</div><div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>QTs</div></div>
          </div>

          {/* Stamp book */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%', margin: '26px 0 4px' }}>
            <div style={sectionTitle}>Stamp Book</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>{earned.length} collected</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 8px', width: '100%' }}>
            {earned.map((t) => (
              <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '58px', height: '69px', boxSizing: 'border-box', padding: '4px', background: '#fff', border: `2px dashed var(--lavender-soft)`, borderRadius: '4px', boxShadow: '0 2px 6px rgba(43,34,56,0.1)' }}>
                  <span style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '2px', background: STAMPS[t].bg, alignItems: 'center', justifyContent: 'center' }}>
                    <QEmoji name={STAMPS[t].art} size={34} />
                  </span>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', lineHeight: 1.25, textAlign: 'center', color: 'var(--ink-mid)' }}>{STAMPS[t].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar />
    </div>
  )
}
