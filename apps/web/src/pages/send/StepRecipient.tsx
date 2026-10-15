import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { inviteRecipientByText } from '../../lib/inviteText'
import QEmoji from '../../components/QEmoji'
import type { NoteData } from './SendFlow'

interface User {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export default function StepRecipient({ onNext, initialQuery }: { onNext: (data: Partial<NoteData>) => void; initialQuery?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [selected, setSelected] = useState<User | null>(null)
  const [searching, setSearching] = useState(false)
  const [inviteState, setInviteState] = useState<'idle' | 'working' | 'copied' | 'sent'>('idle')

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

  useEffect(() => {
    if (initialQuery) search(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function search(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await api.get(`/users?q=${encodeURIComponent(q)}`)
      setResults(res.data.data)
    } finally {
      setSearching(false)
    }
  }

  function select(user: User) {
    setSelected(user)
    setResults([])
    setQuery(user.displayName)
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
        Who's getting the love?
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '24px' }}>
        Search for someone on QuteNote.
      </p>

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => { setSelected(null); search(e.target.value) }}
          placeholder="Search by name or username..."
          style={{
            width: '100%', padding: '11px 16px', fontSize: '14px',
            borderRadius: '10px', border: '1.5px solid var(--border-default)',
            background: 'var(--white)', color: 'var(--ink)',
            outline: 'none', fontFamily: 'var(--font-body)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--lavender)'; e.target.style.boxShadow = 'var(--shadow-input)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none' }}
        />
        {searching && (
          <p style={{ position: 'absolute', right: '16px', top: '13px', fontSize: '12px', color: 'var(--ink-muted)' }}>
            Searching...
          </p>
        )}

        {results.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--white)', border: '1px solid var(--border-default)',
            borderRadius: '14px', boxShadow: 'var(--shadow-card)', zIndex: 10, overflow: 'hidden',
          }}>
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => select(user)}
                style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--lavender-pale)',
                  textTransform: 'none', letterSpacing: 0, fontWeight: 400,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--lavender-pale)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--lavender-pale)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--lavender-dark)', fontWeight: 600, fontSize: '14px', flexShrink: 0,
                }}>
                  {user.displayName[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>{user.displayName}</p>
                  <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>@{user.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={{
          marginTop: '16px', background: 'var(--lavender-pale)',
          border: '1px solid var(--lavender-light)', borderRadius: '14px',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--lavender-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--lavender-deep)', fontWeight: 700, fontSize: '16px',
          }}>
            {selected.displayName[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>{selected.displayName}</p>
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>@{selected.username}</p>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--lavender)', fontSize: '18px' }}>✓</span>
        </div>
      )}

      {!selected && (
        <div style={{
          marginTop: '24px', padding: '16px', borderRadius: '14px',
          background: 'var(--lavender-pale)', border: '1.5px dashed var(--lavender-soft)',
          display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center', alignItems: 'center',
        }}>
          <QEmoji name="envelope" size={32} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 400, color: 'var(--ink)' }}>
            Not on QuteNote yet?
          </p>
          <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', lineHeight: 1.45 }}>
            Text them your link. They set up a free profile, drop in their address, and your card is the first thing in their mailbox.
          </p>
          <button onClick={inviteThem} disabled={inviteState === 'working'} style={{
            height: '42px', padding: '0 20px', borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: 'var(--lavender)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700,
            fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em',
            opacity: inviteState === 'working' ? 0.7 : 1,
          }}>
            {inviteState === 'working' ? 'Getting your link…' : inviteState === 'sent' ? 'Link ready — sent!' : 'Invite them by text'}
          </button>
          {inviteState === 'sent' && (
            <p style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>
              Once they join, come back and their name will be here.
            </p>
          )}
        </div>
      )}

      <button
        disabled={!selected}
        onClick={() => selected && onNext({ recipientId: selected.id, recipientName: selected.displayName })}
        style={{
          width: '100%', marginTop: '24px', padding: '13px 24px', fontSize: '15px', fontWeight: 500,
          borderRadius: '50px', border: 'none', cursor: selected ? 'pointer' : 'not-allowed',
          background: selected ? 'var(--lavender)' : 'var(--lavender-pale)',
          color: selected ? '#fff' : 'var(--ink-muted)',
          boxShadow: selected ? 'var(--shadow-button)' : 'none',
          fontFamily: 'var(--font-body)', transition: 'background 0.15s',
        }}
      >
        Next
      </button>
    </div>
  )
}
