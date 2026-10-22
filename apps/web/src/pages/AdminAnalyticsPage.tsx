import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

// The usability dashboard (Emerald's spec): the two flagship funnels with
// names on every step, the feature-discovery board, and the brick-wall log.
// Admin-only; reads /usage/summary.

const uv = '#5A32D6'

const SEND_STEPS = ['card', 'recipient', 'write', 'review', 'mailed']
const SETUP_STEPS = ['account-created', 'address-saved', 'setup-complete']
const FEATURES = [
  ['drafts', 'Drafts'], ['scheduling', 'Scheduling'], ['secret-pen', 'Secret 🤫 pen'],
  ['flower-pen', 'Flowers 🌷 pen'], ['decode', 'Decode button'], ['handwriting-studio', 'Handwriting studio'],
  ['add-qt', 'Add QT'], ['extra-card', 'Extra card ($7.95)'],
] as const

interface Summary {
  days: number
  funnels: Record<string, Record<string, string[]>>
  features: Record<string, string[]>
  walls: { id: string; kind: string; screen?: string; target?: string; detail?: string; who: string; createdAt: string }[]
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [days, setDays] = useState(7)
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/usage/summary?days=${days}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.response?.data?.error ?? 'Could not load analytics.'))
  }, [days])

  if (!user?.isAdmin) return <p style={{ padding: 40, fontFamily: 'var(--font-body)' }}>Admins only.</p>

  const card: React.CSSProperties = { background: '#fff', border: '1.5px solid var(--stone)', borderRadius: '16px', padding: '16px', marginTop: '14px' }
  const h2: React.CSSProperties = { margin: '0 0 10px', fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '18px', color: 'var(--ink)' }
  const small: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-mid)' }

  const funnel = (title: string, key: string, steps: string[]) => {
    const f = data?.funnels?.[key] ?? {}
    const max = Math.max(1, ...steps.map((s) => (f[s] ?? []).length))
    return (
      <div style={card}>
        <h2 style={h2}>{title}</h2>
        {steps.map((s) => {
          const who = f[s] ?? []
          return (
            <div key={s} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)' }}>
                <span>{s}</span><strong>{who.length}</strong>
              </div>
              <div style={{ height: '10px', borderRadius: '5px', background: 'var(--pink-pale)', overflow: 'hidden' }}>
                <div style={{ width: `${(who.length / max) * 100}%`, height: '100%', background: uv }} />
              </div>
              {who.length > 0 && <div style={small}>{who.join(', ')}</div>}
            </div>
          )
        })}
        {Object.keys(f).length === 0 && <p style={small}>Nothing yet in this window.</p>}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: '560px', margin: '0 auto', padding: '20px 20px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--lavender-pale)', border: 'none', cursor: 'pointer', color: uv }}>←</button>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '24px', color: 'var(--ink)' }}>Usability</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {[7, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{
              height: '32px', padding: '0 12px', borderRadius: '16px', cursor: 'pointer',
              border: `1.5px solid ${days === d ? uv : 'var(--stone)'}`,
              background: days === d ? uv : '#fff', color: days === d ? '#fff' : 'var(--ink)',
              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
            }}>{d}d</button>
          ))}
        </div>
      </div>

      {error && <p style={{ ...small, color: 'var(--error)', marginTop: '14px' }}>{error}</p>}

      {funnel('Sending a card', 'send', SEND_STEPS)}
      {funnel('First-time setup', 'setup', SETUP_STEPS)}

      <div style={card}>
        <h2 style={h2}>Feature discovery</h2>
        {FEATURES.map(([key, label]) => {
          const who = data?.features?.[key] ?? []
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '14px', color: who.length ? 'var(--ink)' : 'var(--ink-muted)' }}>{label}</span>
              <strong style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>{who.length || '—'}</strong>
              <span style={{ ...small, maxWidth: '55%', textAlign: 'right' }}>{who.join(', ')}</span>
            </div>
          )
        })}
      </div>

      <div style={card}>
        <h2 style={h2}>Brick walls 🧱</h2>
        {(data?.walls ?? []).length === 0 && <p style={small}>None in this window. Lovely.</p>}
        {(data?.walls ?? []).map((w) => (
          <div key={w.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--divider)', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)' }}>
            <strong>{w.who}</strong> · {w.kind} · {w.detail ?? `${w.target ?? ''} on ${w.screen ?? ''}`}
            <div style={small}>{new Date(w.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
