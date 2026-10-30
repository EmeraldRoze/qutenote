import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { inviteByText } from '../lib/inviteText'
import QEmoji from '../components/QEmoji'
import TabBar from '../components/TabBar'
import StatusBox from '../components/StatusBox'
import TwinklingCake from '../components/TwinklingCake'
import { type MyStatus } from '../components/Happenings'
import { fetchHandwritingProgress } from '../lib/handwriting/api'
import { remindersEnabled } from '../lib/push'
import QRCodeSheet from '../components/QRCodeSheet'
import { PENDING_SCAN_KEY } from './CardScanPage'
import QIcon from '../components/QIcon'

// Home tab, restyled to palette 4 (qutenote-app-palette4, 10-home).

interface OfferCard {
  art: string
  artWidth: number
  artBoxH?: number
  ombre?: string
  /* false = the ombre holds still (her Lavender dusk card ships that way) */
  live?: boolean
  /* the ombre is one of her gradient pictures, so it drifts and drifts back
     instead of wrapping (Emerald, Oct 29) */
  artOmbre?: boolean
  title: string
  cta: string
  onClick: (navigate: ReturnType<typeof useNavigate>) => void
}
// Copy comes straight from 10-home.html, plus the handwriting card
// (Emerald, Oct 18). Invite + photo live forever; the others retire once done.
// Every card wears the same Rose paper ombre now (.rose-paper).

// The band of light that travels through a card's ombre (.ombre-live animates
// this layer's position). The ombre underneath never moves — Emerald, Oct 24:
// the card must read as a full ombre at every moment, never one solid color.
// Emerald, Oct 25: this used to be ONE band stretched across the whole layer,
// so when the ten-second drift restarted the light jumped back across the
// card. It now repeats on the SAME 320px period as the colors underneath, so
// the end of the loop is pixel-identical to the start.
const SHEEN = 'repeating-linear-gradient(145deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.06) 72px, rgba(255,255,255,0.42) 160px, rgba(255,255,255,0.06) 248px, rgba(255,255,255,0) 320px)'
const ALL_OFFER_CARDS: (OfferCard & { key: string })[] = [
  // Her own gradients now, not mixes of them (Emerald, Oct 29): lemon sky on
  // the hands, apricot sky on the camera, periwinkle pink on the cake.
  { key: 'invite', art: 'bff-live', artWidth: 525, artBoxH: 253, artOmbre: true, ombre: `${SHEEN}, url('/brand/lemon-sky-tile.webp')`, title: 'Invite friends,\nget free cards.', cta: 'INVITE', onClick: (nav) => nav('/invite') },
  { key: 'first-card', art: 'gift', artWidth: 165, ombre: `${SHEEN}, repeating-linear-gradient(145deg, #AE8FD1 0px, #D6C7DF 80px, #EFE7E0 160px, #D6C7DF 240px, #AE8FD1 320px)`, title: 'Your first card is on us', cta: 'SEND A CARD', onClick: (nav) => nav('/send') },
  // Mailbox wears her Lavender paper, camera wears her Apricot sky (Emerald,
  // Oct 24; colors sampled from her gradient files), each the full diagonal
  // spread of the art — it stays put while the sheen passes through it.
  { key: 'alerts', art: 'mailbox', artWidth: 165, ombre: `${SHEEN}, repeating-linear-gradient(145deg, #AE8FD1 0px, #D6C7DF 80px, #EFE7E0 160px, #D6C7DF 240px, #AE8FD1 320px)`, title: 'Know when something is in the mail', cta: 'TURN ON ALERTS', onClick: (nav) => nav('/settings/notifications') },
  { key: 'handwriting', art: 'pen', artWidth: 150, title: 'Make it look like YOU wrote it', cta: 'TEACH YOUR HANDWRITING', onClick: (nav) => nav('/handwriting') },
  // Her Lavender dusk card (qutenote-home-dates-card package, Oct 24): slate
  // into dusty lavender into baby blue, a glossy streak and a soft bottom
  // shadow, no paper grain, and it does not drift like the others.
  { key: 'dates', art: 'cake', artWidth: 160, artOmbre: true, ombre: `${SHEEN}, url('/brand/periwinkle-pink-tile.webp')`, title: 'Remember the important things', cta: 'ADD A DATE', onClick: (nav) => nav('/dates/add') },
  { key: 'photo', art: 'camera', artWidth: 190, artOmbre: true, ombre: `${SHEEN}, url('/brand/apricot-sky-tile.webp')`, title: 'Got a good photo? Mail it.', cta: 'UPLOAD A PHOTO', onClick: (nav) => nav('/send') },
]

function OfferCarousel({ hasSentCard, hasHandwriting }: { hasSentCard: boolean; hasHandwriting: boolean }) {
  const navigate = useNavigate()
  const trackRef = useRef<HTMLDivElement>(null)
  // A done nudge stops nudging; invite + photo never retire.
  const OFFER_CARDS = ALL_OFFER_CARDS.filter((c) => {
    if (c.key === 'first-card') return !hasSentCard
    if (c.key === 'alerts') return !remindersEnabled()
    if (c.key === 'handwriting') return !hasHandwriting
    return true
  })

  function scrollToCard(i: number) {
    const el = trackRef.current
    if (!el) return
    const step = (el.firstElementChild?.clientWidth ?? el.clientWidth) + 12
    el.scrollTo({ left: i * step, behavior: 'smooth' })
  }

  return (
    <div style={{ marginTop: '18px' }}>
      <div
        ref={trackRef}
        style={{
          display: 'flex', gap: '12px', overflowX: 'auto',
          scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
        }}
        /* a scrolling strip has to be reachable and arrow-key scrollable by
           keyboard, not mouse-only (Emerald, Oct 30) */
        tabIndex={0}
        role="group"
        aria-label="Things you can do"
      >
        {OFFER_CARDS.map((c, i) => (
          <div key={i} className={c.ombre ? (c.live === false ? 'rose-paper' : `rose-paper ombre-live${c.artOmbre ? ' ombre-art' : ''}`) : 'rose-paper'}
            /* tap anywhere on the invite card still works, but the card is no
               longer announced as a button wrapped around another button
               (WCAG 4.1.2). The CTA inside is the real control. */
            onClick={c.key === 'invite' ? () => c.onClick(navigate) : undefined}
            style={{
            ...(c.key === 'invite' ? { cursor: 'pointer' } : {}),
            ...(c.ombre ? (c.live === false
              ? { backgroundImage: c.ombre }
              : { ['--qn-ombre' as string]: c.ombre }) : {}),
            flex: '0 0 calc(100% - 32px)', height: '370px', scrollSnapAlign: 'start',
            position: 'relative', borderRadius: '26px', boxSizing: 'border-box',
            padding: '26px 22px 22px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
          }}>
            <div style={{ height: `${c.artBoxH ?? 170}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c.art === 'cake' ? (
                <TwinklingCake size={c.artWidth} style={{ transform: 'rotate(-4deg)' }} />
              ) : (
                <QEmoji name={c.art} size={c.artWidth} style={{ maxHeight: `${c.artBoxH ?? 170}px`, transform: 'rotate(-4deg)' }} />
              )}
            </div>
            <p style={{ margin: '16px 0 0', fontFamily: 'var(--font-display)', fontSize: '22px', lineHeight: '36px', letterSpacing: '-0.01em', color: 'var(--ink)', whiteSpace: 'pre-line' }}>
              {c.title}
            </p>
            {c.key !== 'invite' && (
              <button onClick={(e) => { e.stopPropagation(); c.onClick(navigate) }} style={{
                marginTop: 'auto', height: '50px', padding: '0 28px', borderRadius: '25px', border: '2px solid var(--outline)', cursor: 'pointer',
                background: 'var(--btn)', color: 'var(--ink)', fontFamily: 'var(--font-body)',
                fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em', boxSizing: 'border-box',
              }}>{c.cta}</button>
            )}
            {/* stopPropagation on the arrows: the invite card is itself a tap
                target, so without it the arrow opened the invite page instead
                of turning to the next card (Emerald, Oct 25) */}
            {i > 0 && (
              <button aria-label="Previous card" onClick={(e) => { e.stopPropagation(); scrollToCard(i - 1) }} style={{
                position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.45, color: 'var(--ink)',
              }}>
                <QIcon name="chevron-left" size={18} />
              </button>
            )}
            {i < OFFER_CARDS.length - 1 && (
              <button aria-label="Next card" onClick={(e) => { e.stopPropagation(); scrollToCard(i + 1) }} style={{
                position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.45, color: 'var(--ink)',
              }}>
                <QIcon name="chevron-right" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}

interface SetupTask { key: string; art: string; artSize?: number; label: string; done: boolean; onClick: (navigate: ReturnType<typeof useNavigate>) => void }

// "Get set up": progress out of 5; each tile disappears once its task is done.
function SetupChecklist({ tasks }: { tasks: SetupTask[] }) {
  const navigate = useNavigate()
  const done = tasks.filter((t) => t.done).length
  const total = tasks.length
  if (done >= total) return null
  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 300 }}>Get set</h2>
        <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>{done} of {total} done</span>
      </div>
      <div aria-hidden style={{ marginTop: '10px', height: '8px', borderRadius: '4px', background: 'var(--progress-track)' }}>
        <div style={{ width: `${(done / total) * 100}%`, height: '8px', borderRadius: '4px', background: 'var(--highlight)', transition: 'width 0.3s' }} />
      </div>
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
        {tasks.filter((t) => !t.done).map((t) => (
          <button key={t.key} onClick={() => t.onClick(navigate)} style={{
            minHeight: '168px', borderRadius: '22px', background: 'var(--card)', border: '1.5px solid var(--outline)',
            padding: '18px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', gap: '14px', textAlign: 'center',
            textTransform: 'none', letterSpacing: 0,
          }}>
            <QEmoji name={t.art} size={t.artSize ?? 72} />
            <span style={{ fontSize: '16px', fontWeight: 700, lineHeight: '18px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>{t.label}</span>
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

const OCCASION_ART: Record<string, string> = {
  BIRTHDAY: 'cake', ANNIVERSARY: 'hearteyes', CONGRATULATIONS: 'popper',
  HOLIDAY: 'star', CONSOLATION: 'rainbow', JUST_BECAUSE: 'envelope',
  INVITATION: 'plane', CUSTOM: 'envelope',
}

// Said out loud, for the feed (Emerald, Oct 27: she wants to know WHEN a
// status was posted, not decode "3h").
function whenPosted(d: string) {
  const mins = Math.floor((Date.now() - +new Date(d)) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysUntil(month: number, day: number) {
  const now = new Date()
  const year = now.getFullYear()
  let next = new Date(year, month - 1, day)
  const today = new Date(year, now.getMonth(), now.getDate())
  if (next < today) next = new Date(year + 1, month - 1, day)
  return Math.round((+next - +today) / 86400000)
}

// Instagram-style people search on Home (Emerald, Oct 24): type a name and
// matching QuteNote users populate underneath; if nobody matches, the panel
// offers to text them an invite instead.
interface FoundUser { id: string; username: string; displayName: string; avatarUrl: string | null }

function useUserSearch(query: string) {
  const [results, setResults] = useState<FoundUser[]>([])
  const [searching, setSearching] = useState(false)
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(() => {
      api.get(`/users?q=${encodeURIComponent(q)}`)
        .then((res) => setResults(res.data.data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 220)
    return () => clearTimeout(t)
  }, [query])
  return { results, searching }
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
  const [inviting, setInviting] = useState(false)
  const [lastSeen] = useState(() => Number(localStorage.getItem('qn_feed_seen') ?? 0))
  const [search, setSearch] = useState('')
  const { results: foundUsers, searching } = useUserSearch(search)
  const statusBoxRef = useRef<HTMLDivElement>(null)

  // A card scanned before signing in waits here — open it now (1-hour window)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_SCAN_KEY)
      if (!raw) return
      localStorage.removeItem(PENDING_SCAN_KEY)
      const { code, at } = JSON.parse(raw)
      if (code && Date.now() - at < 60 * 60 * 1000) navigate(`/card/${code}`)
    } catch { /* a malformed entry just gets dropped */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    { key: 'friends', art: 'bff', artSize: 86, label: 'Find your people', done: !!friendCount && friendCount > 0, onClick: (nav) => nav('/connections') },
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
      {/* The search sits right at the top of the page, not floating in the
          middle of a tall band (Emerald, Oct 24). The body already carries the
          status-bar inset in the app, so 12px is all the breathing room it needs. */}
      <header className="title-band" style={{ height: '186px', justifyContent: 'flex-start', paddingTop: '12px' }}>
        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>

          {/* Search + QR row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            <label style={{ flex: 1, height: '48px', borderRadius: '24px', background: 'var(--card)', border: '1.5px solid var(--outline)', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
              <QIcon name="search" size={22} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && search.trim()) navigate(`/connections?q=${encodeURIComponent(search.trim())}`) }}
                placeholder="Find a QT"
                aria-label="Find a QT"
                style={{ border: 0, outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--ink)', width: '100%', height: '100%' }}
              />
            </label>
            <button onClick={() => setShowQR(true)} aria-label="Your QR code" style={{
              width: '48px', height: '48px', borderRadius: '50%', border: '1.5px solid var(--outline)', background: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', cursor: 'pointer', flexShrink: 0,
            }}>
              <QIcon name="qr" size={22} />
            </button>
            {/* Matches drop in under the bar as you type */}
            {search.trim().length >= 2 && (
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 'calc(100% + 8px)', zIndex: 40,
                background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px',
                boxShadow: '0 12px 30px rgba(74,36,36,0.16)', overflow: 'hidden',
              }}>
                {foundUsers.length > 0 ? (
                  foundUsers.map((u, i) => (
                    <button key={u.id} onClick={() => { setSearch(''); navigate(`/profile/${u.username}`) }} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px',
                      background: 'none', border: 0, borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
                      textTransform: 'none', letterSpacing: 0, fontWeight: 400,
                    }}>
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '18px', objectFit: 'cover', flex: 'none' }} />
                        : <QEmoji name="heart-sparkle" size={34} style={{ flex: 'none' }} />}
                      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.displayName}</span>
                        <span style={{ fontSize: '13px', color: 'var(--ink-mid)' }}>@{u.username}</span>
                      </span>
                    </button>
                  ))
                ) : searching ? (
                  <p style={{ margin: 0, padding: '14px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>Looking…</p>
                ) : (
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>
                      No one on QuteNote by that name.
                    </p>
                    <button disabled={inviting} onClick={async () => {
                      setInviting(true)
                      try { await inviteByText() } finally { setInviting(false) }
                    }} style={{
                      height: '46px', borderRadius: '23px', border: '2px solid var(--outline)', background: 'var(--btn)',
                      color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700,
                      letterSpacing: '0.08em', cursor: 'pointer', opacity: inviting ? 0.6 : 1,
                    }}>INVITE THEM BY TEXT</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Greeting */}
          <div style={{ marginTop: '20px' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>Hi, {firstName}.</h1>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)' }}>
              Feelin' Qute?
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
          <div style={{ marginTop: '18px', padding: '16px', borderRadius: '22px', background: 'var(--card)', border: '1.5px solid var(--outline)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <QEmoji name={/birth/i.test(nudge.label) ? 'cake' : 'star'} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-block', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)', background: 'var(--lime)', padding: '3px 9px', borderRadius: '10px' }}>
                  {nudge.days === 0 ? 'Today' : `In ${nudge.days} day${nudge.days === 1 ? '' : 's'}`}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', marginTop: '2px', fontWeight: 300, letterSpacing: '-0.01em' }}>
                  {nudge.connectionName}'s {nudge.label.toLowerCase()}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '15px', lineHeight: '18px', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
              Write it now. We'll mail it so it lands on the day.
            </div>
            <button onClick={() => navigate(`/send?toName=${encodeURIComponent(nudge.connectionName.split(' ')[0])}`)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '50px',
              borderRadius: '25px', background: 'var(--btn)', color: 'var(--ink)', border: '2px solid var(--outline)', cursor: 'pointer',
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
            border: '2px dashed var(--outline)', background: 'var(--selected-fill)', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            Add your address so QTs can mail you back
          </button>
        )}

        {/* From your QTs */}
        <h2 className="on-paper" style={{ margin: '30px 0 12px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '20px' }}>From your QTs</h2>

        {feed.length === 0 && (
          <div className="qn-stamp" style={{ border: '10px solid transparent', background: 'transparent', padding: '14px 12px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <QEmoji name="mailbox" size={84} style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: '18px', color: 'var(--ink)' }}>
                It's quiet in here. Once friends join, their birthdays, news and sends show up here.
              </p>
              <button onClick={() => navigate('/connections?sync=1')} style={{
                alignSelf: 'flex-start', height: '44px', padding: '0 18px', borderRadius: '22px', border: '2px solid var(--outline)', cursor: 'pointer',
                background: 'var(--btn)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', boxSizing: 'border-box',
              }}>SYNC CONTACTS</button>
            </div>
          </div>
        )}

        {feed.map((item) => (
          item.kind === 'status' ? (
            /* One calm card per status (Emerald's pick, Oct 27): who and when
               in a quiet line, the status itself as the headline, and the wax
               heart on the right — no circle around it. */
            <div key={`${item.kind}-${item.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: 'var(--card)', borderRadius: '20px', padding: '16px 18px',
              marginBottom: '12px', boxShadow: '0 4px 14px rgba(74,36,36,0.07)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink)', opacity: 0.75, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <QEmoji name={item.emoji || 'thought-bubble'} size={20} style={{ height: 'auto' }} />
                  <span>{item.user?.displayName} · {whenPosted(item.createdAt)}</span>
                  {+new Date(item.createdAt) > lastSeen && (
                    <span style={{ width: '9px', height: '9px', borderRadius: '5px', background: 'var(--highlight)', border: '1.5px solid var(--outline)' }} />
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '18px', lineHeight: '24px', color: 'var(--ink)', margin: '6px 0 0' }}>
                  {item.text}
                </div>
              </div>
              <button
                aria-label={`Send ${item.user?.displayName.split(' ')[0] ?? 'them'} a little somethin'`}
                onClick={() => navigate(`/send?toName=${encodeURIComponent(item.user?.displayName.split(' ')[0] ?? '')}`)}
                style={{
                  flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: '3px',
                }}
              >
                <img src="/brand/wax_heart.png" alt="" style={{ width: '30px', height: 'auto' }} />
                <svg aria-hidden width="18" height="22" viewBox="0 0 16 20" fill="none" stroke="#4A2424" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M1 4c2.4-1.6 4-1.6 6.4 0s4 1.6 6.4 0M1 10c2.4-1.6 4-1.6 6.4 0s4 1.6 6.4 0M1 16c2.4-1.6 4-1.6 6.4 0s4 1.6 6.4 0" />
                </svg>
              </button>
            </div>
          ) : (
            <div key={`${item.kind}-${item.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: 'var(--card)', borderRadius: '20px', padding: '16px 18px',
              marginBottom: '12px', boxShadow: '0 4px 14px rgba(74,36,36,0.07)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink)', opacity: 0.75, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <QEmoji name={OCCASION_ART[item.occasionType ?? 'CUSTOM'] ?? 'envelope'} size={20} style={{ height: 'auto' }} />
                  <span>{whenPosted(item.createdAt)}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '18px', lineHeight: '24px', color: 'var(--ink)', margin: '6px 0 0' }}>
                  {item.sender?.displayName} sent a card
                </div>
              </div>
              <button onClick={() => toggleHeart(item)} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', border: 'none',
                background: 'transparent', padding: 0, fontSize: '13px', cursor: 'pointer',
                color: 'var(--ink)', fontFamily: 'var(--font-body)',
                textTransform: 'none', letterSpacing: 0, fontWeight: item.heartedByMe ? 700 : 400,
              }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill={item.heartedByMe ? '#4A2424' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
                {item.hearts}
              </button>
            </div>
          )
        ))}
      </div>

      {showQR && user?.username && <QRCodeSheet username={user.username} onClose={() => setShowQR(false)} />}

      <TabBar />
    </div>
  )
}
