import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'
import TabBar from '../components/TabBar'
import { StatusComposer, type MyStatus } from '../components/Happenings'
import { fetchHandwritingProgress } from '../lib/handwriting/api'
import QRCodeSheet from '../components/QRCodeSheet'

interface OfferCard {
  bg: string
  art: string
  title: string
  cta: string
  onClick: (navigate: ReturnType<typeof useNavigate>) => void
}
const OFFER_CARDS: OfferCard[] = [
  { bg: 'var(--lilac)', art: 'heart-sparkle', title: 'Your first card is on us', cta: 'Send a card', onClick: (nav) => nav('/send') },
  { bg: 'var(--neon-pink)', art: 'bff', title: 'Invite a friend. You both get a free card.', cta: 'Invite', onClick: (nav) => nav('/invite') },
  { bg: 'var(--lime)', art: 'mailbox', title: 'Know when something is in the mail', cta: 'Turn on alerts', onClick: (nav) => nav('/dates') },
  { bg: 'var(--lavender-light)', art: 'camera', title: 'Got a good photo? Mail it.', cta: 'Upload a photo', onClick: (nav) => nav('/send') },
]

function OfferCarousel() {
  const navigate = useNavigate()
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div style={{ marginTop: '18px' }}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          gap: '12px', scrollbarWidth: 'none', borderRadius: '26px',
        }}
      >
        {OFFER_CARDS.map((c, i) => (
          <div key={i} style={{
            flex: '0 0 100%', scrollSnapAlign: 'start', background: c.bg,
            borderRadius: '26px', padding: '28px 24px', display: 'flex',
            flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px',
          }}>
            <QEmoji name={c.art} size={64} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.2 }}>{c.title}</div>
            <button onClick={() => c.onClick(navigate)} style={{
              height: '44px', padding: '0 22px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700,
              fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>{c.cta}</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
        {OFFER_CARDS.map((_, i) => (
          <span key={i} style={{
            width: i === active ? '18px' : '6px', height: '6px', borderRadius: '3px',
            background: i === active ? 'var(--ink)' : 'var(--stone)', transition: 'width 0.2s',
          }} />
        ))}
      </div>
    </div>
  )
}

interface SetupTask { key: string; art: string; label: string; done: boolean; onClick: (navigate: ReturnType<typeof useNavigate>) => void }

function SetupChecklist({ tasks, hasSentCard }: { tasks: SetupTask[]; hasSentCard: boolean }) {
  const navigate = useNavigate()
  const done = tasks.filter((t) => t.done).length
  const total = tasks.length
  // Stays around (in its trimmed, all-done form) until the first card actually
  // ships — a fresh profile with nothing sent yet still deserves this nudge.
  if (done >= total && hasSentCard) return null
  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, letterSpacing: '-0.01em' }}>Get set up</div>
        <div style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>{done} of {total} done</div>
      </div>
      <div style={{ height: '5px', borderRadius: '3px', background: 'var(--stone)', marginTop: '8px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(done / total) * 100}%`, background: 'var(--ultraviolet)', borderRadius: '3px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
        {tasks.filter((t) => t.done).map((t) => (
          <div key={t.key} style={{
            padding: '14px', borderRadius: '18px', background: 'var(--lavender-pale)', border: '1px solid var(--lavender-light)',
            display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7,
          }}>
            <QEmoji name={t.art} size={28} />
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>{t.label} ✓</span>
          </div>
        ))}
        {tasks.filter((t) => !t.done).map((t) => (
          <button key={t.key} onClick={() => t.onClick(navigate)} style={{
            padding: '18px 14px', borderRadius: '18px', background: '#fff', border: '1px solid var(--stone)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center',
          }}>
            <QEmoji name={t.art} size={44} />
            <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const uv = '#5A32D6'
const label: React.CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--ink-mid)' }

interface FeedUser { id: string; username: string; displayName: string; avatarUrl: string | null }
interface FeedItem {
  kind: 'status' | 'note'
  id: string
  createdAt: string
  hearts: number
  heartedByMe: boolean
  emoji?: string | null
  text?: string
  user?: FeedUser
  occasionType?: string
  sender?: FeedUser
  recipient?: FeedUser
}
interface ImportantDate { id: string; connectionName: string; label: string; month: number; day: number }

const OCCASION_SENTENCE: Record<string, string> = {
  BIRTHDAY: 'a birthday note', ANNIVERSARY: 'an anniversary note',
  CONGRATULATIONS: 'a congrats note', HOLIDAY: 'a holiday note',
  CONSOLATION: 'a thinking-of-you note', JUST_BECAUSE: 'a just-because note',
  INVITATION: 'an invitation', CUSTOM: 'a note',
}
const OCCASION_ART: Record<string, string> = {
  BIRTHDAY: 'cake', ANNIVERSARY: 'hearteyes', CONGRATULATIONS: 'popper',
  HOLIDAY: 'star', CONSOLATION: 'rainbow', JUST_BECAUSE: 'envelope',
  INVITATION: 'plane', CUSTOM: 'envelope',
}

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - +new Date(d)) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`
  return `${Math.floor(mins / 1440)}d`
}

function daysUntil(month: number, day: number) {
  const now = new Date()
  const year = now.getFullYear()
  let next = new Date(year, month - 1, day)
  const today = new Date(year, now.getMonth(), now.getDate())
  if (next < today) next = new Date(year + 1, month - 1, day)
  return Math.round((+next - +today) / 86400000)
}

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [myStatus, setMyStatus] = useState<MyStatus | null>(null)
  const [hasAddress, setHasAddress] = useState<boolean | null>(null)
  const [friendCount, setFriendCount] = useState<number | null>(null)
  const [hasHandwriting, setHasHandwriting] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [composing, setComposing] = useState(false)
  const [lastSeen] = useState(() => Number(localStorage.getItem('qn_feed_seen') ?? 0))
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/statuses/home-feed').then((r) => setFeed(r.data.data)).catch(() => {})
    api.get('/important-dates').then((r) => setDates(r.data.data)).catch(() => {})
    api.get('/statuses/mine').then((r) => setMyStatus(r.data.data)).catch(() => {})
    api.get('/address/me').then((r) => setHasAddress(!!r.data.data)).catch(() => setHasAddress(null))
    api.get('/connections').then((r) => setFriendCount(r.data.data.length)).catch(() => setFriendCount(null))
    fetchHandwritingProgress().then((r) => setHasHandwriting(r.hasFont)).catch(() => {})
    localStorage.setItem('qn_feed_seen', String(Date.now()))
  }, [])

  const firstName = user?.displayName?.split(' ')[0] ?? ''

  const setupTasks: SetupTask[] = [
    { key: 'address', art: 'house', label: 'Add your address', done: hasAddress === true, onClick: (nav) => nav('/address') },
    { key: 'friends', art: 'bff', label: 'Find your people', done: !!friendCount && friendCount > 0, onClick: (nav) => nav('/connections') },
    { key: 'status', art: 'thought-bubble', label: 'Set your status', done: !!myStatus, onClick: () => setComposing(true) },
    { key: 'handwriting', art: 'pen', label: 'Teach us your handwriting', done: hasHandwriting, onClick: (nav) => nav('/handwriting') },
  ]
  const hasSentCard = !!user?.notesUsed
  const setupDone = setupTasks.filter((t) => t.done).length >= setupTasks.length

  const nudge = useMemo(() => {
    const upcoming = dates
      .map((d) => ({ ...d, days: daysUntil(d.month, d.day) }))
      .filter((d) => d.days <= 45)
      .sort((a, b) => a.days - b.days)[0]
    return upcoming ?? null
  }, [dates])

  async function toggleHeart(item: FeedItem) {
    const targetType = item.kind === 'status' ? 'STATUS' : 'NOTE'
    setFeed((f) => f.map((i) => i === item
      ? { ...i, heartedByMe: !i.heartedByMe, hearts: i.hearts + (i.heartedByMe ? -1 : 1) }
      : i))
    try { await api.post('/statuses/heart', { targetType, targetId: item.id }) } catch { /* refreshed on next load */ }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '110px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '18px 24px 0' }}>

        {/* Search + scan row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 14px', borderRadius: '999px', background: '#fff', border: '1px solid var(--stone)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && search.trim()) navigate(`/connections?q=${encodeURIComponent(search.trim())}`) }}
              placeholder="Find a QT"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}
            />
          </div>
          <button onClick={() => setShowQR(true)} aria-label="Your QR code" style={{
            width: '44px', height: '44px', borderRadius: '50%', background: '#fff', border: '1px solid var(--stone)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M21 14v3h-3M14 21h3" /></svg>
          </button>
        </div>

        {/* Greeting */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '27px', lineHeight: 1.18, color: 'var(--ink)', fontWeight: 400, letterSpacing: '-0.01em', margin: '22px 0 0' }}>
          Hi, {firstName}.
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', marginTop: '4px' }}>
          {setupDone ? "What's new with you?" : "Let's get your first card in the mail."}
        </p>

        {!setupDone && <OfferCarousel />}
        <SetupChecklist tasks={setupTasks} hasSentCard={hasSentCard} />

        {/* Happenings status row */}
        <button onClick={() => setComposing(true)} style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%', marginTop: '18px',
          padding: '8px 12px 8px 8px', borderRadius: '30px', border: '1px solid var(--stone)',
          background: '#fff', boxShadow: '0 4px 14px rgba(43,34,56,0.05)', cursor: 'pointer', textAlign: 'left',
        }}>
          <span style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '20px', background: 'var(--lavender-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QEmoji name={myStatus?.emoji ?? 'sun'} size={28} />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={label}>Happenings</span>
            <span style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: myStatus ? 'var(--ink)' : 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {myStatus?.text ?? "What's new with you?"}
            </span>
          </span>
          <span style={{ color: uv, display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z" /></svg>
          </span>
        </button>

        {/* Date nudge */}
        {nudge && (
          <div style={{ marginTop: '18px', padding: '16px', borderRadius: '16px', background: 'var(--lavender-pale)', border: '1px solid var(--lavender-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <QEmoji name={/birth/i.test(nudge.label) ? 'cake' : 'star'} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--ink)', background: 'var(--lime)', padding: '3px 9px', borderRadius: '10px' }}>
                  {nudge.days === 0 ? 'Today' : `In ${nudge.days} day${nudge.days === 1 ? '' : 's'}`}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', marginTop: '2px', fontWeight: 400, letterSpacing: '-0.01em' }}>
                  {nudge.connectionName}'s {nudge.label.toLowerCase()}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '15px', lineHeight: 1.45, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
              Write it now. We'll mail it so it lands on the day.
            </div>
            <button onClick={() => navigate(`/send?toName=${encodeURIComponent(nudge.connectionName.split(' ')[0])}`)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '46px',
              borderRadius: '10px', background: uv, color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              Write to {nudge.connectionName.split(' ')[0]}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        )}

        {/* Address nudge — safety net once the checklist above is no longer showing it */}
        {setupDone && hasAddress === false && (
          <button onClick={() => navigate('/address')} style={{
            width: '100%', marginTop: '14px', padding: '12px 16px', borderRadius: '12px',
            border: '1.5px dashed var(--lavender-soft)', background: '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '13px', color: uv, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            Add your address so QTs can mail you back
          </button>
        )}

        {/* Feed */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 0 2px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 400, letterSpacing: '-0.01em' }}>From your QTs</div>
          <button onClick={() => navigate('/invite')} style={{
            padding: '7px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700,
            fontSize: '11px', letterSpacing: '0.1em',
          }}>
            + Invite friends
          </button>
        </div>
        <div style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>Statuses and public sends. Messages are never shown.</div>

        {feed.length === 0 && (
          <div style={{ marginTop: '14px', padding: '22px 20px', borderRadius: '20px', background: 'var(--lavender-pale)', border: `1.5px dashed var(--lavender-soft)`, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <QEmoji name="mailbox" size={52} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.4 }}>
              It's quiet in here. Once friends join, their birthdays, news and sends show up here.
            </p>
          </div>
        )}

        {feed.map((item) => (
          <div key={`${item.kind}-${item.id}`} style={{ display: 'flex', gap: '12px', padding: '16px 0', borderBottom: '1px solid var(--stone)' }}>
            {item.kind === 'status' ? (
              <span style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '18px', background: 'var(--lavender-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '9px' }}>
                {(item.user?.displayName ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            ) : (
              <span style={{ width: '36px', minWidth: '36px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <QEmoji name={OCCASION_ART[item.occasionType ?? 'CUSTOM'] ?? 'envelope'} size={36} />
              </span>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {item.kind === 'status' ? (
                <>
                  <div style={{ fontSize: '15px', fontFamily: 'var(--font-body)' }}>
                    <strong>{item.user?.displayName}</strong>{' '}
                    <span style={{ color: 'var(--ink-mid)' }}>shared a status · {timeAgo(item.createdAt)}</span>
                    {+new Date(item.createdAt) > lastSeen && (
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', marginLeft: '6px', borderRadius: '5px', background: 'var(--lime)', border: '1.5px solid var(--ink)', verticalAlign: 'middle' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', borderRadius: '12px', background: '#fff', border: '1px solid var(--stone)' }}>
                    {item.emoji && <QEmoji name={item.emoji} size={18} />}
                    <span style={{ fontSize: '15px', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>{item.text}</span>
                  </div>
                  <button onClick={() => navigate(`/send?toName=${encodeURIComponent(item.user?.displayName.split(' ')[0] ?? '')}`)} style={{
                    alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', height: '40px',
                    padding: '0 12px 0 14px', borderRadius: '6px', background: 'var(--lavender-pale)',
                    border: '1.5px dashed var(--lavender-soft)', color: uv, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em',
                  }}>
                    Send a little somethin'
                    <span style={{ position: 'relative', width: '26px', height: '17px', flexShrink: 0 }}>
                      <img src="/brand/postmark-heart-only.png" alt="" style={{ position: 'absolute', inset: 0, width: '26px', height: '17px', objectFit: 'contain' }} />
                      <img src="/brand/postmark-waves-only.png" alt="" style={{ position: 'absolute', inset: 0, width: '26px', height: '17px', objectFit: 'contain' }} />
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '15px', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>
                    <strong>{item.sender?.displayName}</strong> sent <strong>{item.recipient?.displayName}</strong>{' '}
                    {OCCASION_SENTENCE[item.occasionType ?? 'CUSTOM'] ?? 'a note'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>
                    <span>{timeAgo(item.createdAt)}</span>
                    <button onClick={() => toggleHeart(item)} style={{
                      height: '30px', display: 'flex', alignItems: 'center', gap: '5px', border: 'none',
                      background: 'transparent', padding: 0, fontSize: '13px', cursor: 'pointer',
                      color: item.heartedByMe ? uv : 'var(--ink-mid)', fontFamily: 'var(--font-body)',
                      textTransform: 'none', letterSpacing: 0, fontWeight: item.heartedByMe ? 700 : 400,
                    }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill={item.heartedByMe ? uv : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
                      {item.hearts}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status composer */}
      {composing && <StatusComposer onDone={(s) => { if (s) setMyStatus(s); setComposing(false) }} />}
      {showQR && user?.username && <QRCodeSheet username={user.username} onClose={() => setShowQR(false)} />}

      <TabBar />
    </div>
  )
}
