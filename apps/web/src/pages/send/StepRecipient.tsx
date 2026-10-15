import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { inviteRecipientByText } from '../../lib/inviteText'
import { CARD_LOOKUP } from '../../lib/cards'
import QEmoji from '../../components/QEmoji'
import type { NoteData } from './SendFlow'

// Send step 2 ("Who's it for?"), rebuilt to the Oct 15 2026 design:
// the chosen card up top with a CHANGE link, a search field, the QT list
// as selectable rows (birthdays coming up first), and the text-an-address
// invite box for people who aren't on QuteNote yet.

const uv = '#5A32D6'

interface Connection {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  hasAddress: boolean
  connectedAt: string
}
interface ImportantDate { id: string; connectionName: string; label: string; month: number; day: number }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const AVATAR_BGS = ['var(--lavender-pale)', 'var(--lavender-light)', 'var(--lilac)', 'var(--neon-pink)', 'var(--lime)']

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
  return `In ${days} days`
}
function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function StepRecipient({ note, onChangeCard, onNext, initialQuery }: {
  note: Partial<NoteData>
  onChangeCard: () => void
  onNext: (data: Partial<NoteData>) => void
  initialQuery?: string
}) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(initialQuery ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(note.recipientId ?? null)
  const [inviteState, setInviteState] = useState<'idle' | 'working' | 'sent'>('idle')

  useEffect(() => {
    Promise.all([
      api.get('/connections').then((res) => setConnections(res.data.data ?? [])),
      api.get('/important-dates').then((res) => setDates(res.data.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  async function inviteThem() {
    setInviteState('working')
    try {
      const link = await inviteRecipientByText()
      try { await navigator.clipboard.writeText(link) } catch { /* sms composer already has it */ }
      setInviteState('sent')
    } catch {
      setInviteState('idle')
    }
  }

  // Each QT's next birthday (first matching date per name), like the QTs tab.
  const dateFor = useMemo(() => {
    const map = new Map<string, ImportantDate>()
    for (const d of dates) {
      const key = d.connectionName.toLowerCase()
      if (!map.has(key)) map.set(key, d)
    }
    return (name: string) => map.get(name.toLowerCase())
  }, [dates])

  const q = query.trim().toLowerCase()
  const shown = useMemo(() => {
    const list = q
      ? connections.filter((c) => c.displayName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q))
      : connections
    const withDays = list.map((c) => {
      const d = dateFor(c.displayName)
      return { c, d, days: d ? daysUntil(d.month, d.day) : Infinity }
    })
    const upcoming = withDays.filter((x) => x.days <= 14).sort((a, b) => a.days - b.days)
    const rest = withDays.filter((x) => x.days > 14)
    return { upcoming, rest }
  }, [connections, q, dateFor])

  const selected = connections.find((c) => c.id === selectedId) ?? null

  // The chosen card, shown up top with a CHANGE link back to step 1
  const design = note.cardDesignId ? CARD_LOOKUP[note.cardDesignId] : undefined
  const cardThumb = note.cardImageUrl ?? design?.art
  const cardLine = note.cardImageUrl
    ? 'Your photo'
    : design
      ? `${design.title} by ${design.handle ?? design.artist}`
      : 'Pick a card'

  function row(c: Connection, subtitle: string, pill?: string) {
    const isSelected = c.id === selectedId
    const avatarBg = AVATAR_BGS[(c.username.length + c.displayName.length) % AVATAR_BGS.length]
    return (
      <button
        key={c.id}
        role="radio"
        aria-checked={isSelected}
        onClick={() => setSelectedId(isSelected ? null : c.id)}
        style={{
          width: '100%', minHeight: '64px', boxSizing: 'border-box', borderRadius: '16px',
          border: isSelected ? '2px dashed var(--lilac)' : '1.5px solid var(--stone)',
          background: isSelected ? 'var(--lavender-pale)' : '#fff',
          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
          fontFamily: 'var(--font-body)', textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
          textTransform: 'none', letterSpacing: 0, fontWeight: 400,
        }}
      >
        <span style={{ width: '40px', height: '40px', flex: 'none', borderRadius: '50%', background: avatarBg, border: '1.5px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>{initials(c.displayName)}</span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>{c.displayName}</span>
          <span style={{ fontSize: '13px', color: 'var(--ink-mid)' }}>{subtitle}</span>
        </span>
        {pill && (
          <span style={{ fontSize: '13px', fontWeight: 700, background: 'var(--lime)', borderRadius: '10px', padding: '3px 9px', whiteSpace: 'nowrap' }}>{pill}</span>
        )}
        <span style={{
          width: '24px', height: '24px', flex: 'none', borderRadius: '50%',
          display: isSelected ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
          background: uv, color: '#fff',
        }}>
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
      </button>
    )
  }

  const sectionHead: React.CSSProperties = { margin: '18px 0 8px', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Your card */}
      <div style={{ marginTop: '16px', background: '#fff', border: '1.5px solid var(--stone)', borderRadius: '16px', padding: '8px 12px 8px 8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {cardThumb ? (
          <img src={cardThumb} alt="" style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px', border: '1.5px solid var(--ink)', flex: 'none' }} />
        ) : (
          <span style={{ width: '40px', height: '56px', borderRadius: '4px', border: '1.5px solid var(--ink)', background: design?.bg ?? 'var(--lavender-pale)', flex: 'none' }} />
        )}
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>Your card</span>
          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>{cardLine}</span>
        </span>
        <button onClick={onChangeCard} style={{
          minHeight: '44px', padding: 0, background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', fontFamily: 'var(--font-body)',
          fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: uv,
        }}>CHANGE</button>
      </div>

      {/* Search */}
      <label style={{ marginTop: '14px', height: '48px', borderRadius: '24px', background: '#fff', border: '1.5px solid var(--stone)', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mid)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your QTs"
          aria-label="Search your QTs"
          style={{ border: 0, outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%' }}
        />
      </label>

      {loading ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)', padding: '20px 0' }}>Fetching your people…</p>
      ) : (
        <>
          {shown.upcoming.length > 0 && (
            <>
              <h2 style={sectionHead}>Birthdays coming up</h2>
              <div role="radiogroup" aria-label="Recipient" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shown.upcoming.map(({ c, d, days }) => row(c, d ? `${MONTHS[d.month - 1]} ${d.day}` : `@${c.username}`, countdownLabel(days)))}
              </div>
            </>
          )}

          {shown.rest.length > 0 && (
            <>
              <h2 style={sectionHead}>Your QTs</h2>
              <div role="radiogroup" aria-label="Recipient" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shown.rest.map(({ c }) => row(c, `@${c.username}`))}
              </div>
            </>
          )}

          {shown.upcoming.length === 0 && shown.rest.length === 0 && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)', padding: '20px 0 4px' }}>
              {q ? 'No QTs match that.' : 'No QTs yet — invite someone below and your card is the first thing in their mailbox.'}
            </p>
          )}
        </>
      )}

      {/* Someone not on QuteNote yet? Text them for their address. */}
      <button
        onClick={inviteThem}
        disabled={inviteState === 'working'}
        style={{
          marginTop: '12px', minHeight: '60px', boxSizing: 'border-box', borderRadius: '16px',
          border: '2px dashed var(--lilac)', background: 'var(--lavender-pale)',
          display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 14px',
          color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-body)',
          textTransform: 'none', letterSpacing: 0, fontWeight: 400, textAlign: 'left',
          opacity: inviteState === 'working' ? 0.7 : 1,
        }}
      >
        <QEmoji name="mailbox" size={40} style={{ flex: 'none', height: 'auto' }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>Someone not on QuteNote yet?</span>
          <span style={{ fontSize: '13px', color: 'var(--ink-mid)' }}>
            {inviteState === 'working' ? 'Getting your link…' : inviteState === 'sent' ? 'Link ready — sent!' : "We'll text them for their address."}
          </span>
        </span>
      </button>
      {inviteState === 'sent' && (
        <p style={{ margin: '8px 2px 0', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>
          Once they join, come back and their name will be here.
        </p>
      )}

      <button
        disabled={!selected}
        onClick={() => selected && onNext({ recipientId: selected.id, recipientName: selected.displayName })}
        style={{
          marginTop: '24px', height: '56px', borderRadius: '28px', border: 'none',
          cursor: selected ? 'pointer' : 'not-allowed',
          background: uv, opacity: selected ? 1 : 0.45, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em',
        }}
      >
        CONTINUE
      </button>
    </div>
  )
}
