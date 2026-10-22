import { useEffect, useMemo, useState } from 'react'
import { trackFeature } from '../lib/analytics'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import TabBar from '../components/TabBar'
import QEmoji from '../components/QEmoji'
import { inviteByText } from '../lib/inviteText'
import { contactsAvailable, readContacts, matchContactsToMembers, type MatchedMember } from '../lib/contacts'

// QTs tab, rebuilt to the Oct 15 redesign (design/redesign-oct15-2026, 12-qts):
// invite box first, then search, then friends sorted by whose birthday is next.
// On the native app it can also sync the address book to find people already
// on QuteNote (opened with ?sync=1, or via the Sync contacts button).

const uv = '#5A32D6'
const label: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mid)', fontFamily: 'var(--font-body)' }

interface Connection {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  hasAddress: boolean
  connectedAt: string
}
interface SearchResult { id: string; username: string; displayName: string; avatarUrl: string | null }
interface PendingRequest { id: string; username: string; displayName: string; avatarUrl: string | null; requestId: string }
interface ImportantDate { id: string; connectionName: string; label: string; month: number; day: number }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// Paper-collage avatar fills, cycled down the list like the design file.
const AVATAR_BG = ['var(--lavender-pale)', 'var(--lavender-light)', 'var(--neon-pink)', 'var(--lime)', 'var(--lilac)', '#FFFFFF']

function daysUntil(month: number, day: number): number {
  const now = new Date()
  const year = now.getFullYear()
  let next = new Date(year, month - 1, day)
  const today = new Date(year, now.getMonth(), now.getDate())
  if (next < today) next = new Date(year + 1, month - 1, day)
  return Math.round((+next - +today) / 86400000)
}
function countdownLabel(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 7) return `In ${days} days`
  return `${days} days`
}

export default function ConnectionsPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [requested, setRequested] = useState<Set<string>>(new Set())

  // Contacts sync (native app only)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'failed'>('idle')
  const [matches, setMatches] = useState<MatchedMember[]>([])
  const [syncChecked, setSyncChecked] = useState(0)
  const [syncError, setSyncError] = useState('')

  async function syncContacts() {
    if (!contactsAvailable || syncState === 'syncing') return
    setSyncState('syncing')
    setSyncError('')
    try {
      const contacts = await readContacts()
      if (!contacts) { setSyncError('Contacts permission was not granted.'); setSyncState('failed'); return }
      setSyncChecked(contacts.length)
      const matched = await matchContactsToMembers(contacts)
      setMatches(matched)
      setSyncState('done')
    } catch (err: any) {
      // Surface the real reason — a tester saying "it didn't work" should be
      // able to screenshot exactly what went wrong.
      setSyncError(String(err?.message ?? err ?? 'unknown error'))
      setSyncState('failed')
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/connections').then((res) => setConnections(res.data.data)),
      api.get('/connections/requests').then((res) => setPendingRequests(res.data.data)),
      api.get('/important-dates').then((res) => setDates(res.data.data)).catch(() => {}),
      // requests already sent render as "Requested" instead of a dead Add QT
      api.get('/connections/outgoing').then((res) => setRequested(new Set(res.data.data))).catch(() => {}),
    ]).finally(() => setLoading(false))
    // Opened as "/connections?sync=1" (e.g. from Home's SYNC CONTACTS button)
    if (new URLSearchParams(window.location.search).get('sync') === '1' && contactsAvailable) {
      syncContacts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await api.get(`/users?q=${encodeURIComponent(query)}`)
      setResults(res.data.data)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function sendRequest(userId: string) {
    trackFeature('add-qt')
    try {
      await api.post(`/connections/request/${userId}`)
    } catch (err: any) {
      // 409 = already sent — the button should settle into Requested, not sulk
      if (err.response?.status !== 409) return
    }
    setRequested(new Set([...requested, userId]))
  }
  async function acceptRequest(requestId: string) {
    await api.post(`/connections/accept/${requestId}`)
    setPendingRequests((p) => p.filter((r) => r.requestId !== requestId))
    api.get('/connections').then((res) => setConnections(res.data.data))
  }
  async function declineRequest(requestId: string) {
    await api.post(`/connections/decline/${requestId}`)
    setPendingRequests((p) => p.filter((r) => r.requestId !== requestId))
  }
  async function togglePrivacy() {
    await api.post('/connections/privacy', { isPrivate: !user?.isPrivate })
    refreshUser?.()
  }

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  // Connection birthdays come from the important-dates API, matched by name.
  const dateFor = useMemo(() => {
    const map = new Map<string, ImportantDate>()
    for (const d of dates) {
      const key = d.connectionName.toLowerCase()
      if (!map.has(key)) map.set(key, d)
    }
    return (name: string) => map.get(name.toLowerCase())
  }, [dates])

  const shownConnections = useMemo(() => {
    const list = query.length >= 2
      ? connections.filter((c) => c.displayName.toLowerCase().includes(query.toLowerCase()) || c.username.toLowerCase().includes(query.toLowerCase()))
      : connections
    return [...list].sort((a, b) => {
      const da = dateFor(a.displayName), db = dateFor(b.displayName)
      const ra = da ? daysUntil(da.month, da.day) : Infinity
      const rb = db ? daysUntil(db.month, db.day) : Infinity
      return ra - rb
    })
  }, [connections, query, dateFor])

  // Contact matches worth suggesting: on QuteNote, not me, not already a QT.
  const suggestedMatches = matches.filter((m) => m.id !== user?.id && !connections.some((c) => c.id === m.id))

  const newResults = results.filter((r) => !connections.some((c) => c.id === r.id) && r.id !== user?.id)

  function avatar(name: string, i: number, size = 44) {
    return (
      <span style={{
        width: `${size}px`, height: `${size}px`, flexShrink: 0, borderRadius: '50%',
        background: AVATAR_BG[i % AVATAR_BG.length], border: '1.5px solid var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: 'var(--ink)',
      }}>{initials(name)}</span>
    )
  }

  const addButton = (id: string) => (
    <button
      disabled={requested.has(id)}
      onClick={() => sendRequest(id)}
      style={{
        height: '34px', padding: '0 12px', borderRadius: '999px', cursor: 'pointer', flexShrink: 0,
        border: `1.5px solid ${uv}`, background: requested.has(id) ? 'var(--lavender-pale)' : '#fff',
        color: uv, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em',
      }}
    >
      {requested.has(id) ? 'Requested' : 'Add QT'}
    </button>
  )

  const listCard: React.CSSProperties = { background: '#fff', border: '1.5px solid var(--stone)', borderRadius: '18px', overflow: 'hidden' }
  const row = (last: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', minHeight: '68px',
    borderBottom: last ? 'none' : '1.5px solid var(--stone)',
  })

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>

      {/* Title band */}
      <header className="title-band" style={{ height: '144px' }}>
        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '30px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>QTs</h1>
        </div>
      </header>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>

        {/* Invite box first */}
        <div style={{ marginTop: '16px', borderRadius: '22px', background: 'var(--lilac)', padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <QEmoji name="bff" size={64} style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.4, color: 'var(--ink)' }}>
              Invite a friend. You both get a free card.
            </p>
            <button onClick={() => inviteByText(user?.displayName?.split(' ')[0]).catch(() => navigate('/invite'))} style={{
              alignSelf: 'flex-start', height: '44px', padding: '0 18px', borderRadius: '22px', border: 0, cursor: 'pointer',
              background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em',
            }}>INVITE</button>
          </div>
        </div>

        {/* Search */}
        <label style={{ marginTop: '16px', height: '48px', borderRadius: '24px', background: '#fff', border: '1.5px solid var(--stone)', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mid)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your QTs"
            aria-label="Search your QTs"
            style={{ border: 0, outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--ink)', width: '100%' }}
          />
        </label>

        {/* Contacts sync (native app only) */}
        {contactsAvailable && syncState !== 'done' && (
          <button onClick={syncContacts} disabled={syncState === 'syncing'} style={{
            width: '100%', marginTop: '12px', height: '44px', borderRadius: '22px', cursor: 'pointer',
            border: '2px dashed var(--lilac)', background: 'var(--lavender-pale)', color: uv,
            fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em',
          }}>
            {syncState === 'syncing' ? 'CHECKING YOUR CONTACTS…' : 'SYNC CONTACTS'}
          </button>
        )}
        {syncState === 'failed' && (
          <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>
            We couldn't read your contacts{syncError ? ` (${syncError})` : ''}. Check Settings → QuteNote → Contacts, or invite friends by text instead.
          </p>
        )}

        {/* Contact matches: people already on QuteNote */}
        {syncState === 'done' && (
          <div style={{ marginTop: '20px' }}>
            <p style={{ ...label, margin: 0 }}>Already on QuteNote</p>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-muted)' }}>
              Checked {syncChecked} contact{syncChecked === 1 ? '' : 's'} · {suggestedMatches.length} on QuteNote
            </p>
            {suggestedMatches.length === 0 ? (
              <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>
                None of your contacts are on QuteNote yet. Invite them and you both get a free card.
              </p>
            ) : (
              <div style={{ ...listCard, marginTop: '10px' }}>
                {suggestedMatches.map((m, i) => (
                  <div key={m.id} style={row(i === suggestedMatches.length - 1)}>
                    {avatar(m.displayName, i)}
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700 }}>{m.displayName}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>@{m.username}</span>
                    </span>
                    {addButton(m.id)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* People on QuteNote matching the search (not yet QTs) */}
        {newResults.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <p style={{ ...label, margin: '0 0 10px' }}>On QuteNote</p>
            <div style={listCard}>
              {newResults.map((r, i) => (
                <div key={r.id} style={row(i === newResults.length - 1)}>
                  {avatar(r.displayName, i)}
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700 }}>{r.displayName}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>@{r.username}</span>
                  </span>
                  {addButton(r.id)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <p style={{ ...label, margin: '0 0 10px' }}>Wants to be your QT</p>
            <div style={listCard}>
              {pendingRequests.map((r, i) => (
                <div key={r.requestId} style={{ ...row(i === pendingRequests.length - 1), background: 'var(--lavender-pale)' }}>
                  {avatar(r.displayName, i + 1)}
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700 }}>{r.displayName}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>@{r.username}</span>
                  </span>
                  <button onClick={() => acceptRequest(r.requestId)} style={{ height: '34px', padding: '0 12px', borderRadius: '999px', border: 'none', background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer' }}>Yes</button>
                  <button onClick={() => declineRequest(r.requestId)} style={{ height: '34px', padding: '0 10px', borderRadius: '999px', border: '1.5px solid var(--stone)', background: '#fff', color: 'var(--ink-mid)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer' }}>No</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends, sorted by whose birthday is next */}
        {query.length < 2 && shownConnections.length > 0 && (
          <p style={{ margin: '20px 0 0', fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)' }}>
            Sorted by whose birthday is next.
          </p>
        )}

        {loading ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)', padding: '20px 0' }}>Fetching your people…</p>
        ) : shownConnections.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)', padding: '20px 0' }}>
            {query.length >= 2 ? 'No QTs match that.' : 'No QTs yet. Search for someone above, or send an invite.'}
          </p>
        ) : (
          <div style={{ ...listCard, marginTop: '10px' }}>
            {shownConnections.map((c, i) => {
              const d = dateFor(c.displayName)
              const days = d ? daysUntil(d.month, d.day) : null
              return (
                <button key={c.id} onClick={() => navigate(`/profile/${c.username}`)} style={{
                  ...row(i === shownConnections.length - 1), width: '100%',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  textTransform: 'none', letterSpacing: 0, fontWeight: 400,
                  borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                }}>
                  {avatar(c.displayName, i)}
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>{c.displayName}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)' }}>
                      {d ? `${MONTHS[d.month - 1]} ${d.day}` : `@${c.username}`}
                    </span>
                  </span>
                  {days !== null && (
                    <span style={{
                      fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)',
                      borderRadius: '10px', padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0,
                      background: days <= 7 ? 'var(--lime)' : 'var(--lavender-light)',
                    }}>{countdownLabel(days)}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Privacy */}
        <div style={{ marginTop: '22px', padding: '14px 16px', borderRadius: '18px', background: '#fff', border: '1.5px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700 }}>Who sees your sends</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
              {user?.isPrivate ? 'Private: your sends stay off feeds.' : 'Public: your sends show on QT feeds. Messages are never shown.'}
            </div>
          </div>
          <span style={{ display: 'flex', padding: '3px', borderRadius: '10px', background: 'var(--lavender-pale)', flexShrink: 0 }}>
            <button onClick={() => user?.isPrivate || togglePrivacy()} style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', background: user?.isPrivate ? '#fff' : 'transparent', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink)', cursor: 'pointer' }}>Private</button>
            <button onClick={() => user?.isPrivate && togglePrivacy()} style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', background: user?.isPrivate ? 'transparent' : '#fff', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink)', cursor: 'pointer' }}>Public</button>
          </span>
        </div>
      </div>
      <TabBar />
    </div>
  )
}
