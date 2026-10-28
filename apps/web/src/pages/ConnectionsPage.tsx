import { useEffect, useMemo, useState } from 'react'
import { trackFeature } from '../lib/analytics'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import TabBar from '../components/TabBar'
import QEmoji from '../components/QEmoji'
import { inviteByText } from '../lib/inviteText'
import { contactsAvailable, readContacts, matchContactsToMembers, type MatchedMember } from '../lib/contacts'
import QIcon from '../components/QIcon'

// QTs tab, restyled to palette 4 (qutenote-app-palette4, 12-qts):
// invite box first, then search, then friends sorted by whose birthday is next.
// On the native app it can also sync the address book to find people already
// on QuteNote (opened with ?sync=1, or via the Sync contacts button).

const label: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mid)', fontFamily: 'var(--font-body)' }

interface Connection {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  hasAddress: boolean
  connectedAt: string
  birthdayMonth?: number | null
  birthdayDay?: number | null
}
interface SearchResult { id: string; username: string; displayName: string; avatarUrl: string | null }
interface PendingRequest { id: string; username: string; displayName: string; avatarUrl: string | null; requestId: string }
interface ImportantDate { id: string; connectionName: string; label: string; month: number; day: number }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function daysUntil(month: number, day: number): number {
  const now = new Date()
  const year = now.getFullYear()
  let next = new Date(year, month - 1, day)
  const today = new Date(year, now.getMonth(), now.getDate())
  if (next < today) next = new Date(year + 1, month - 1, day)
  return Math.round((+next - +today) / 86400000)
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
  // Requests used to be a block buried under the friends list, easy to miss
  // entirely (Emerald, Oct 27). They get their own tab now.
  const [tab, setTab] = useState<'qts' | 'requests'>('qts')
  const [sentRequests, setSentRequests] = useState<PendingRequest[]>([])

  // Contacts sync (native app only)
  // Synced once = the button never comes back, even after a restart
  // (Emerald, Oct 27).
  const SYNCED_KEY = 'qn_contacts_synced'
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'failed'>(
    (() => { try { return localStorage.getItem(SYNCED_KEY) ? 'done' : 'idle' } catch { return 'idle' } })()
  )
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
      try { localStorage.setItem(SYNCED_KEY, new Date().toISOString()) } catch { /* private mode */ }
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
      api.get('/connections/outgoing/details').then((res) => setSentRequests(res.data.data ?? [])).catch(() => {}),
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

  // Connection birthdays come from the important-dates API, matched by name.
  const dateFor = useMemo(() => {
    const map = new Map<string, ImportantDate>()
    for (const d of dates) {
      const key = d.connectionName.toLowerCase()
      if (!map.has(key)) map.set(key, d)
    }
    return (name: string) => map.get(name.toLowerCase())
  }, [dates])

  // A QT's countdown: their own birthday from their profile, otherwise an
  // Important date saved under their name (Emerald, Oct 24).
  const birthdayDays = (c: Connection): number => {
    if (c.birthdayMonth && c.birthdayDay) return daysUntil(c.birthdayMonth, c.birthdayDay)
    const d = dateFor(c.displayName)
    return d ? daysUntil(d.month, d.day) : Infinity
  }

  const shownConnections = useMemo(() => {
    const list = query.length >= 2
      ? connections.filter((c) => c.displayName.toLowerCase().includes(query.toLowerCase()) || c.username.toLowerCase().includes(query.toLowerCase()))
      : connections
    return [...list].sort((a, b) => birthdayDays(a) - birthdayDays(b))
  }, [connections, query, dateFor])

  // Contact matches worth suggesting: on QuteNote, not me, not already a QT.
  const suggestedMatches = matches.filter((m) => m.id !== user?.id && !connections.some((c) => c.id === m.id))

  const newResults = results.filter((r) => !connections.some((c) => c.id === r.id) && r.id !== user?.id)

  // People rows lead with the heart sparkle emoji (palette 4), not initials.
  function avatar(size = 44) {
    return <QEmoji name="heart-sparkle" size={size} style={{ flexShrink: 0 }} />
  }

  const addButton = (id: string) => (
    <button
      disabled={requested.has(id)}
      onClick={() => sendRequest(id)}
      style={{
        height: '34px', padding: '0 12px', borderRadius: '999px', cursor: 'pointer', flexShrink: 0,
        border: '1.5px solid var(--outline)', background: requested.has(id) ? 'var(--selected-fill)' : 'var(--card)',
        color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em',
      }}
    >
      {requested.has(id) ? 'Requested' : 'Add QT'}
    </button>
  )

  const listCard: React.CSSProperties = { background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px', overflow: 'hidden' }
  const row = (last: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', minHeight: '68px',
    borderBottom: last ? 'none' : '1.5px solid var(--outline)',
  })

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>

      {/* No "QTs" title: the invite stamp lives up here instead
          (Emerald, Oct 27) */}
      <header className="title-band" style={{ height: '180px', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>
          <div className="qn-stamp" style={{ border: '10px solid transparent', background: 'transparent', padding: '12px 10px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <QEmoji name="invite" size={92} style={{ flexShrink: 0, height: 'auto' }} />
            <p style={{ flex: 1, minWidth: 0, margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: '18px', color: 'var(--ink)', whiteSpace: 'pre-line' }}>
              {'Invite friends,\nget free cards.'}
            </p>
            <button
              onClick={() => inviteByText(user?.displayName?.split(' ')[0]).catch(() => navigate('/invite'))}
              aria-label="Invite friends"
              style={{
                width: '44px', height: '44px', flex: 'none', borderRadius: '50%',
                border: '2px solid var(--outline)', background: 'var(--btn)', color: 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                padding: 0, boxSizing: 'border-box',
              }}
            >
              <svg aria-hidden width="18" height="18" viewBox="0 0 18 18">
                <rect x="7.6" y="1.6" width="2.8" height="14.8" rx="1.4" fill="currentColor" />
                <rect x="1.6" y="7.6" width="14.8" height="2.8" rx="1.4" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>

        {/* Search first */}
        <label style={{ marginTop: '16px', height: '48px', borderRadius: '24px', background: 'var(--card)', border: '1.5px solid var(--outline)', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          <QIcon name="search" size={22} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your QTs"
            aria-label="Search your QTs"
            style={{ border: 0, outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--ink)', width: '100%' }}
          />
        </label>
        {/* Paper tabs: the active one is part of the sheet below it, like a
            file folder (Emerald's pick, Oct 27) */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '16px', marginBottom: '-1.5px', position: 'relative', zIndex: 1 }}>
          {([['qts', 'YOUR QTS'], ['requests', `REQUESTS${pendingRequests.length ? ` (${pendingRequests.length})` : ''}`]] as const).map(([key, text]) => {
            const on = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  border: '1.5px solid var(--outline)', borderBottomColor: on ? 'var(--card)' : 'var(--outline)',
                  background: on ? 'var(--card)' : 'var(--paper)',
                  borderRadius: '12px 12px 0 0', padding: '9px 16px', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
                  letterSpacing: '0.06em', textIndent: '0.06em', color: 'var(--ink)',
                  opacity: on ? 1 : 0.55,
                }}
              >
                {text}
              </button>
            )
          })}
        </div>

        {/* Contacts sync (native app only) */}
        {contactsAvailable && syncState !== 'done' && (
          <button onClick={syncContacts} disabled={syncState === 'syncing'} style={{
            width: '100%', marginTop: '12px', height: '44px', borderRadius: '22px', cursor: 'pointer',
            border: '2px dashed var(--outline)', background: 'var(--selected-fill)', color: 'var(--ink)',
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
                    {avatar()}
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
                  {avatar()}
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

        {tab === 'requests' && (
          <>
            <p className="on-paper" style={{ ...label, margin: '20px 0 10px' }}>Wants to be your QT</p>
            {pendingRequests.length === 0 ? (
              <p className="on-paper" style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '8px' }}>
                Nobody's asked yet.
              </p>
            ) : (
              <div style={listCard}>
                {pendingRequests.map((r, i) => (
                  <div key={r.requestId} style={{ ...row(i === pendingRequests.length - 1), background: 'var(--selected-fill)' }}>
                    {avatar()}
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700 }}>{r.displayName}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>@{r.username}</span>
                    </span>
                    <button onClick={() => acceptRequest(r.requestId)} style={{ height: '34px', padding: '0 12px', borderRadius: '999px', border: '1.5px solid var(--outline)', background: 'var(--btn)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => declineRequest(r.requestId)} style={{ height: '34px', padding: '0 10px', borderRadius: '999px', border: '1.5px solid var(--outline)', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer' }}>No</button>
                  </div>
                ))}
              </div>
            )}

            <p className="on-paper" style={{ ...label, margin: '22px 0 10px' }}>Waiting on them</p>
            {sentRequests.length === 0 ? (
              <p className="on-paper" style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                You haven't asked anyone yet.
              </p>
            ) : (
              <div style={listCard}>
                {sentRequests.map((r, i) => (
                  <div key={r.requestId} style={row(i === sentRequests.length - 1)}>
                    {avatar()}
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700 }}>{r.displayName}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>@{r.username}</span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body)', background: 'var(--light-blush)', borderRadius: '10px', padding: '4px 10px' }}>Asked</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Friends, still sorted by whose birthday is next — the caption that
            said so is gone (Emerald, Oct 24) */}

        {tab === 'qts' && (loading ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', padding: '20px 0' }}>Fetching your people…</p>
        ) : shownConnections.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)', padding: '20px 0' }}>
            {query.length >= 2 ? 'No QTs match that.' : 'No QTs yet. Search for someone above, or send an invite.'}
          </p>
        ) : (
          <div style={{ ...listCard, marginTop: '10px' }}>
            {shownConnections.map((c, i) => {
              const d = dateFor(c.displayName)
              const bMonth = c.birthdayMonth ?? d?.month ?? null
              const bDay = c.birthdayDay ?? d?.day ?? null
              return (
                <button key={c.id} onClick={() => navigate(`/profile/${c.username}`)} style={{
                  ...row(i === shownConnections.length - 1), width: '100%',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  textTransform: 'none', letterSpacing: 0, fontWeight: 400,
                  borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                }}>
                  {/* Emerald, Oct 27: no sparkle heart beside the name and no
                      countdown pill — the wax heart sends them one from here. */}
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>{c.displayName}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>
                      {bMonth && bDay ? `${MONTHS[bMonth - 1]} ${bDay}` : `@${c.username}`}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Send ${c.displayName.split(' ')[0]} a little somethin'`}
                    onClick={(e) => { e.stopPropagation(); navigate(`/send?toId=${c.id}&toName=${encodeURIComponent(c.displayName)}`) }}
                    style={{
                      flexShrink: 0, minWidth: '46px', height: '36px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer',
                    }}
                  >
                    <img src="/brand/wax_heart.png" alt="" style={{ width: '26px', height: 'auto' }} />
                    <svg aria-hidden width="16" height="20" viewBox="0 0 16 20" fill="none" stroke="#4A2424" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M1 4c2.4-1.6 4-1.6 6.4 0s4 1.6 6.4 0M1 10c2.4-1.6 4-1.6 6.4 0s4 1.6 6.4 0M1 16c2.4-1.6 4-1.6 6.4 0s4 1.6 6.4 0" />
                    </svg>
                  </span>
                </button>
              )
            })}
          </div>
        ))}

        {/* Privacy */}
        <div style={{ marginTop: '22px', padding: '14px 16px', borderRadius: '18px', background: 'var(--card)', border: '1.5px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700 }}>Who sees your sends</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
              {user?.isPrivate ? 'Private: your sends stay off feeds.' : 'Public: your sends show on QT feeds. Messages are never shown.'}
            </div>
          </div>
          <span style={{ display: 'flex', padding: '3px', borderRadius: '10px', background: 'var(--light-blush)', flexShrink: 0 }}>
            <button onClick={() => user?.isPrivate || togglePrivacy()} style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', background: user?.isPrivate ? 'var(--card)' : 'transparent', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink)', cursor: 'pointer' }}>Private</button>
            <button onClick={() => user?.isPrivate && togglePrivacy()} style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', background: user?.isPrivate ? 'transparent' : 'var(--card)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink)', cursor: 'pointer' }}>Public</button>
          </span>
        </div>
      </div>
      <TabBar />
    </div>
  )
}
