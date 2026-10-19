import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'
import TabBar from '../components/TabBar'
import StatusBox from '../components/StatusBox'
import { type MyStatus } from '../components/Happenings'
import { fetchHandwritingProgress } from '../lib/handwriting/api'
import { remindersEnabled } from '../lib/push'
import QRCodeSheet from '../components/QRCodeSheet'

// Home tab, rebuilt to the Oct 15 redesign (design/redesign-oct15-2026, 10-home).

const uv = '#5A32D6'

interface OfferCard {
  bg: string
  border?: string
  art: string
  artWidth: number
  title: string
  cta: string
  onClick: (navigate: ReturnType<typeof useNavigate>) => void
}
// Colors and copy come straight from 10-home.html, plus the handwriting card
// (Emerald, Oct 18). Invite + photo live forever; the others retire once done.
const ALL_OFFER_CARDS: (OfferCard & { key: string })[] = [
  { key: 'first-card', bg: 'var(--lilac)', art: 'heart-sparkle', artWidth: 170, title: 'Your first card is on us', cta: 'SEND A CARD', onClick: (nav) => nav('/send') },
  { key: 'invite', bg: 'var(--neon-pink)', art: 'bff', artWidth: 140, title: 'Invite a friend. You both get a free card.', cta: 'INVITE', onClick: (nav) => nav('/invite') },
  { key: 'alerts', bg: 'var(--lavender-light)', art: 'mailbox', artWidth: 165, title: 'Know when something is in the mail', cta: 'TURN ON ALERTS', onClick: (nav) => nav('/settings/notifications') },
  { key: 'handwriting', bg: 'var(--lime)', art: 'pen', artWidth: 150, title: 'Make it look like YOU wrote it', cta: 'TEACH YOUR HANDWRITING', onClick: (nav) => nav('/handwriting') },
  { key: 'photo', bg: '#FFFFFF', border: '1.5px solid var(--stone)', art: 'camera', artWidth: 170, title: 'Got a good photo?\nMail it.', cta: 'UPLOAD A PHOTO', onClick: (nav) => nav('/send') },
]

function OfferCarousel({ hasSentCard, hasHandwriting }: { hasSentCard: boolean; hasHandwriting: boolean }) {
  const navigate = useNavigate()
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  // A done nudge stops nudging; invite + photo never retire.
  const OFFER_CARDS = ALL_OFFER_CARDS.filter((c) => {
    if (c.key === 'first-card') return !hasSentCard
    if (c.key === 'alerts') return !remindersEnabled()
    if (c.key === 'handwriting') return !hasHandwriting
    return true
  })

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    const step = (el.firstElementChild?.clientWidth ?? el.clientWidth) + 12
    setActive(Math.min(OFFER_CARDS.length - 1, Math.max(0, Math.round(el.scrollLeft / step))))
  }

  return (
    <div style={{ marginTop: '18px' }}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        style={{
          display: 'flex', gap: '12px', overflowX: 'auto',
          scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
        }}
      >
        {OFFER_CARDS.map((c, i) => (
          <div key={i} style={{
            flex: '0 0 calc(100% - 32px)', height: '370px', scrollSnapAlign: 'start',
            borderRadius: '26px', background: c.bg, border: c.border ?? '0',
            padding: '26px 22px 22px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
          }}>
            <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QEmoji name={c.art} size={c.artWidth} style={{ maxHeight: '170px', transform: 'rotate(-4deg)' }} />
            </div>
            <p style={{ margin: '16px 0 0', fontFamily: 'var(--font-display)', fontSize: '22px', lineHeight: 1.2, letterSpacing: '-0.01em', color: 'var(--ink)', whiteSpace: 'pre-line' }}>
              {c.title}
            </p>
            <button onClick={() => c.onClick(navigate)} style={{
              marginTop: 'auto', height: '50px', padding: '0 28px', borderRadius: '25px', border: 'none', cursor: 'pointer',
              background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)',
              fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em',
            }}>{c.cta}</button>
          </div>
        ))}
      </div>
      <div aria-hidden style={{ marginTop: '14px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {OFFER_CARDS.map((_, i) => (
          <span key={i} style={{
            width: i === active ? '22px' : '6px', height: '6px', borderRadius: '3px',
            background: i === active ? 'var(--ink)' : '#CFC5E8', transition: 'width 0.2s',
          }} />
        ))}
      </div>
    </div>
  )
}

interface SetupTask { key: string; art: string; label: string; done: boolean; onClick: (navigate: ReturnType<typeof useNavigate>) => void }

// "Get set up": progress out of 5; each tile disappears once its task is done.
function SetupChecklist({ tasks }: { tasks: SetupTask[] }) {
  const navigate = useNavigate()
  const done = tasks.filter((t) => t.done).length
  const total = tasks.length
  if (done >= total) return null
  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400 }}>Get set up</h2>
        <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>{done} of {total} done</span>
      </div>
      <div aria-hidden style={{ marginTop: '10px', height: '8px', borderRadius: '4px', background: 'var(--lavender-light)' }}>
        <div style={{ width: `${(done / total) * 100}%`, height: '8px', borderRadius: '4px', background: uv, transition: 'width 0.3s' }} />
      </div>
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
        {tasks.filter((t) => !t.done).map((t) => (
          <button key={t.key} onClick={() => t.onClick(navigate)} style={{
            minHeight: '168px', borderRadius: '22px', background: '#fff', border: '1.5px solid var(--stone)',
            padding: '18px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', gap: '14px', textAlign: 'center',
            textTransform: 'none', letterSpacing: 0,
          }}>
            <QEmoji name={t.art} size={72} />
            <span style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.3, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

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
  const [lastSeen] = useState(() => Number(localStorage.getItem('qn_feed_seen') ?? 0))
  const [search, setSearch] = useState('')
  const statusBoxRef = useRef<HTMLDivElement>(null)

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

  function focusStatusBox() {
    statusBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const input = statusBoxRef.current?.querySelector('input') as HTMLInputElement | null
    input?.focus({ preventScroll: true })
  }

  // Five tasks; the address one counts as done at sign-up.
  const setupTasks: SetupTask[] = [
    { key: 'address', art: 'house', label: 'Add your address', done: hasAddress !== false, onClick: (nav) => nav('/address') },
    { key: 'friends', art: 'bff', label: 'Find your people', done: !!friendCount && friendCount > 0, onClick: (nav) => nav('/connections') },
    { key: 'birthday', art: 'cake', label: 'Add your birthday. Get Qute Notes.', done: !!user?.birthday, onClick: (nav) => nav('/signup/birthday') },
    { key: 'status', art: 'thought-bubble', label: 'Set your status', done: !!myStatus, onClick: () => focusStatusBox() },
    { key: 'handwriting', art: 'pen', label: 'Teach us your handwriting', done: hasHandwriting, onClick: (nav) => nav('/handwriting') },
  ]
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
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>

      {/* Title band: clear header space, like the top of notebook paper */}
      <header className="title-band" style={{ height: '216px' }}>
        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>

          {/* Search + QR row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ flex: 1, height: '48px', borderRadius: '24px', background: '#fff', border: '1.5px solid var(--stone)', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mid)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && search.trim()) navigate(`/connections?q=${encodeURIComponent(search.trim())}`) }}
                placeholder="Find a QT"
                aria-label="Find a QT"
                style={{ border: 0, outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--ink)', width: '100%' }}
              />
            </label>
            <button onClick={() => setShowQR(true)} aria-label="Your QR code" style={{
              width: '48px', height: '48px', borderRadius: '50%', border: '1.5px solid var(--stone)', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', cursor: 'pointer', flexShrink: 0,
            }}>
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3.5" y="3.5" width="6" height="6" rx="1" /><rect x="14.5" y="3.5" width="6" height="6" rx="1" /><rect x="3.5" y="14.5" width="6" height="6" rx="1" /><path d="M14.5 14.5h2v2h-2zM18.5 18.5h2v2h-2zM14.5 18.5h2" /></svg>
            </button>
          </div>

          {/* Greeting */}
          <div style={{ marginTop: '26px' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Hi, {firstName}.</h1>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink-mid)' }}>
              {setupDone ? "How's your heart?" : "Let's get your first card in the mail."}
            </p>
          </div>

        </div>
      </header>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>

        {/* Status box: always visible, right under the greeting */}
        <div ref={statusBoxRef} style={{ marginTop: '18px' }}>
          <StatusBox onPosted={(s) => setMyStatus(s)} />
        </div>

        {/* The offer carousel lives on Home forever (Emerald, Oct 18) —
            individual cards retire themselves once their thing is done. */}
        <OfferCarousel hasSentCard={!!user?.notesUsed} hasHandwriting={hasHandwriting} />
        <SetupChecklist tasks={setupTasks} />

        {/* Date nudge */}
        {nudge && (
          <div style={{ marginTop: '18px', padding: '16px', borderRadius: '16px', background: 'var(--lavender-pale)', border: '1px solid var(--lavender-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <QEmoji name={/birth/i.test(nudge.label) ? 'cake' : 'star'} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-block', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)', background: 'var(--lime)', padding: '3px 9px', borderRadius: '10px' }}>
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '50px',
              borderRadius: '25px', background: uv, color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '15px', letterSpacing: '0.08em',
            }}>
              Write to {nudge.connectionName.split(' ')[0]}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        )}

        {/* Address nudge: safety net once the checklist above is no longer showing it */}
        {setupDone && hasAddress === false && (
          <button onClick={() => navigate('/address')} style={{
            width: '100%', marginTop: '14px', padding: '12px 16px', borderRadius: '22px',
            border: '2px dashed var(--lilac)', background: 'var(--lavender-pale)', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '13px', color: uv, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            Add your address so QTs can mail you back
          </button>
        )}

        {/* From your QTs */}
        <h2 style={{ margin: '30px 0 12px', fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '20px' }}>From your QTs</h2>

        {feed.length === 0 && (
          <div style={{ borderRadius: '22px', border: '2px dashed var(--lilac)', background: 'var(--lavender-pale)', padding: '22px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <QEmoji name="mailbox" size={84} style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.45, color: 'var(--ink)' }}>
                It's quiet in here. Once friends join, their birthdays, news and sends show up here.
              </p>
              <button onClick={() => navigate('/connections?sync=1')} style={{
                alignSelf: 'flex-start', height: '44px', padding: '0 18px', borderRadius: '22px', border: 'none', cursor: 'pointer',
                background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em',
              }}>SYNC CONTACTS</button>
            </div>
          </div>
        )}

        {feed.map((item) => (
          <div key={`${item.kind}-${item.id}`} style={{ display: 'flex', gap: '12px', padding: '16px 0', borderBottom: '1.5px solid var(--stone)' }}>
            {item.kind === 'status' ? (
              <span style={{ width: '44px', height: '44px', minWidth: '44px', borderRadius: '50%', background: 'var(--lavender-pale)', border: '1.5px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px' }}>
                {(item.user?.displayName ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            ) : (
              <span style={{ width: '44px', minWidth: '44px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <QEmoji name={OCCASION_ART[item.occasionType ?? 'CUSTOM'] ?? 'envelope'} size={40} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', borderRadius: '14px', background: '#fff', border: '1.5px solid var(--stone)' }}>
                      {item.emoji && <QEmoji name={item.emoji} size={18} />}
                      <span style={{ fontSize: '15px', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>{item.text}</span>
                    </div>
                    <button aria-label="Send a little somethin'" onClick={() => navigate(`/send?toName=${encodeURIComponent(item.user?.displayName.split(' ')[0] ?? '')}`)} style={{
                      flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%', background: 'var(--lavender-pale)',
                      border: '1.5px solid var(--lilac)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>
                      <span style={{ position: 'relative', width: '30px', height: '20px' }}>
                        <img src="/brand/postmark-heart-only.png" alt="" style={{ position: 'absolute', inset: 0, width: '30px', height: '20px', objectFit: 'contain' }} />
                        <img src="/brand/postmark-waves-only.png" alt="" style={{ position: 'absolute', inset: 0, width: '30px', height: '20px', objectFit: 'contain' }} />
                      </span>
                    </button>
                  </div>
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

      {showQR && user?.username && <QRCodeSheet username={user.username} onClose={() => setShowQR(false)} />}

      <TabBar />
    </div>
  )
}
