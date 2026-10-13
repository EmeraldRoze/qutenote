import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import QEmoji from '../components/QEmoji'
import { inviteByText } from '../lib/inviteText'
import { enableReminders } from '../lib/push'

// Onboarding — App Screens board 00–04 in the Oct 2026 system.

const uv = '#5A32D6'
const title: React.CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '26px', lineHeight: 1.18, color: 'var(--ink)', letterSpacing: '-0.01em', margin: 0 }
const sub: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.5, color: 'var(--ink-mid)', margin: '8px 0 0' }
const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  width: '100%', height: '52px', borderRadius: '10px', border: 'none', cursor: 'pointer',
  background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700,
  fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
}
const ghostBtn: React.CSSProperties = { ...primaryBtn, background: 'transparent', color: 'var(--ink-mid)' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* ── Welcome (pre-auth, the app's front door) ── */
export function WelcomePage() {
  const navigate = useNavigate()
  return (
    <div style={{ height: '100vh', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '24px' }}>
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/site/qutenote_logo.png" alt="QuteNote" style={{ height: '32px', width: 'auto' }} />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '50px',
          lineHeight: 1.04, letterSpacing: '-0.03em', color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <span style={{ position: 'relative' }}>
            <span>Send</span>
            <img src="/site/postmark_stamp.png" alt="" style={{ position: 'absolute', left: '160px', top: '-52px', width: '196px', height: 'auto', transform: 'rotate(-6deg)' }} />
          </span>
          <span>something</span>
          <span>real.</span>
        </h1>

        <p style={{ ...sub, fontSize: '17px', lineHeight: 1.5, marginTop: '22px', maxWidth: '300px' }}>
          Real postcards for birthdays, hard days and everything between. Connect with friends, no addresses needed.
        </p>
      </div>

      <div style={{ flex: '0 0 auto', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
        <button style={{ ...primaryBtn, height: '56px', fontSize: '16px', letterSpacing: '0.08em', borderRadius: '28px', background: '#fff', color: 'var(--ink)', border: '2px solid var(--ink)' }} onClick={() => navigate('/login')}>Log in</button>
        <button style={{ ...primaryBtn, height: '56px', fontSize: '16px', letterSpacing: '0.08em', borderRadius: '28px' }} onClick={() => navigate('/signup')}>Sign up</button>
      </div>
    </div>
  )
}

/* ── Step shell ── */
function Shell({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '28px 24px 0' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '22px' }}>
          {[1, 2, 3].map((i) => (
            <span key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= step ? uv : 'var(--lavender-light)' }} />
          ))}
        </div>
        {children}
      </div>
    </div>
  )
}

/* ── 1. Pick your first QTs ── */
export function OnboardingQTs() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; displayName: string; username: string }[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await api.get(`/users?q=${encodeURIComponent(query)}`)
      setResults(res.data.data.filter((r: { id: string }) => r.id !== user?.id))
    }, 250)
    return () => clearTimeout(t)
  }, [query, user?.id])

  async function add(id: string) {
    await api.post(`/connections/request/${id}`)
    setAdded(new Set([...added, id]))
  }

  return (
    <Shell step={1}>
      <h1 style={title}>Your circle starts with one.</h1>
      <p style={sub}>Pick a few people you'd mail a postcard to. Add more anytime.</p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or username"
        style={{
          width: '100%', height: '48px', padding: '0 14px', borderRadius: '10px', margin: '18px 0 10px',
          border: '1px solid var(--stone)', background: '#fff', outline: 'none',
          fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {results.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', background: '#fff', border: '1px solid var(--stone)' }}>
            <span style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'var(--lavender-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '12px' }}>
              {r.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
            <span style={{ flex: 1, fontFamily: 'var(--font-body)' }}>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>{r.displayName}</span>
              <span style={{ color: 'var(--ink-mid)', fontSize: '13px' }}> @{r.username}</span>
            </span>
            <button disabled={added.has(r.id)} onClick={() => add(r.id)} style={{
              height: '32px', padding: '0 12px', borderRadius: '999px', cursor: 'pointer',
              border: `1.5px solid ${uv}`, background: added.has(r.id) ? 'var(--lavender-pale)' : '#fff',
              color: uv, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em',
            }}>{added.has(r.id) ? 'Asked' : 'Add'}</button>
          </div>
        ))}
      </div>

      <button onClick={() => inviteByText().catch(() => {})} style={{
        display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px',
        borderRadius: '14px', background: 'var(--lavender-pale)', border: `1.5px dashed var(--lavender-soft)`,
        cursor: 'pointer', textAlign: 'left', margin: '14px 0 24px',
      }}>
        <QEmoji name="gift" size={36} />
        <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>
          Not on QuteNote yet? Text them an invite.
        </span>
      </button>

      <button style={primaryBtn} onClick={() => navigate('/onboarding/birthdays')}>
        Continue{added.size > 0 ? ` · ${added.size} added` : ''}
      </button>
      <button style={ghostBtn} onClick={() => navigate('/onboarding/birthdays')}>Skip for now</button>
    </Shell>
  )
}

/* ── 2. Add birthdays ── */
export function OnboardingBirthdays() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [month, setMonth] = useState(1)
  const [day, setDay] = useState(1)
  const [saved, setSaved] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.post('/important-dates', { connectionName: name.trim(), label: 'Birthday', month, day })
      setSaved((s) => [...s, `${name.trim()} · ${MONTHS[month - 1]} ${day}`])
      setName('')
    } finally {
      setSaving(false)
    }
  }

  const selStyle: React.CSSProperties = {
    height: '48px', padding: '0 10px', borderRadius: '10px', border: '1px solid var(--stone)',
    background: '#fff', fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)',
  }

  return (
    <Shell step={2}>
      <h1 style={title}>When are their birthdays?</h1>
      <p style={sub}>We'll nudge you a week before. Never the year.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '18px 0' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Who's it for?" style={{
          width: '100%', height: '48px', padding: '0 14px', borderRadius: '10px',
          border: '1px solid var(--stone)', background: '#fff', outline: 'none',
          fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)',
        }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ ...selStyle, flex: 1 }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={day} onChange={(e) => setDay(Number(e.target.value))} style={{ ...selStyle, flex: 1 }}>
            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <button disabled={saving || !name.trim()} onClick={add} style={{
            height: '48px', padding: '0 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700,
            fontSize: '12px', letterSpacing: '0.1em', opacity: saving || !name.trim() ? 0.5 : 1,
          }}>Add</button>
        </div>
      </div>

      {saved.map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#fff', border: '1px solid var(--stone)', marginBottom: '8px', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
          <QEmoji name="cake" size={20} />{s}
        </div>
      ))}

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)', margin: '8px 0 20px' }}>
        Not sure of a date? You can always text them: "When's your birthday?"
      </p>

      <button style={primaryBtn} onClick={() => navigate('/onboarding/reminders')}>Continue</button>
      <button style={ghostBtn} onClick={() => navigate('/onboarding/reminders')}>Skip for now</button>
    </Shell>
  )
}

/* ── 3. Turn on reminders ── */
export function OnboardingReminders() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  async function finish(on: boolean) {
    if (on) {
      setBusy(true)
      await enableReminders()
    } else {
      localStorage.setItem('qn_reminders', '0')
    }
    navigate('/home')
  }
  return (
    <Shell step={3}>
      <h1 style={title}>Never miss a birthday.</h1>
      <p style={sub}>We'll nudge you a week before every saved date, right on your home screen.</p>

      {/* Notification preview */}
      <div style={{ margin: '22px 0 26px', padding: '14px 16px', borderRadius: '16px', background: 'var(--lavender-pale)', border: '1px solid var(--lavender-light)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <QEmoji name="cake" size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px' }}>QuteNote</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)' }}>· 7 days out</span>
            <span style={{ marginLeft: 'auto', display: 'inline-block', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink)', background: 'var(--lime)', padding: '2px 8px', borderRadius: '8px' }}>In 7 days</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.45, marginTop: '4px' }}>
            Maya's birthday is next Tuesday. Write it now and we'll mail it so it lands on the day.
          </div>
        </div>
      </div>

      <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={() => finish(true)}>{busy ? 'One sec…' : 'Turn on reminders'}</button>
      <button style={ghostBtn} onClick={() => finish(false)}>Not now</button>
    </Shell>
  )
}
