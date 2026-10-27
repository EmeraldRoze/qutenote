import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import QIcon from '../../components/QIcon'

// One application, everything in it, big enough to actually judge
// (Emerald, Oct 26: "I need to be able to click into each artist application
// and review the materials").

const col: React.CSSProperties = {
  width: '100%', maxWidth: '640px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box',
}
const panel: React.CSSProperties = {
  background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px',
  padding: '16px', marginBottom: '14px', boxShadow: 'var(--shadow-card)',
}
const btn = (fill: string): React.CSSProperties => ({
  height: '48px', padding: '0 24px', borderRadius: '24px', border: '2px solid var(--outline)',
  background: fill, color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '14px',
  fontWeight: 700, letterSpacing: '0.08em', textIndent: '0.08em', cursor: 'pointer',
})
const rowLabel: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }
const rowValue: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: '18px', color: 'var(--ink)' }

export default function AdminArtistDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [a, setA] = useState<any>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/admin/artists/${id}`)
      .then((r) => setA(r.data.data))
      .catch((err) => setError(err?.response?.status === 403 ? 'This account is not an admin.' : 'Could not load that application.'))
  }, [id])

  async function decide(approve: boolean) {
    setBusy(true)
    try {
      await api.post(`/admin/artists/${id}/decision`, { approve, note: note.trim() || undefined })
      navigate('/admin/artists')
    } catch {
      setError("That didn't go through.")
      setBusy(false)
    }
  }

  const field = (label: string, value?: React.ReactNode) => value ? (
    <div style={{ marginBottom: '12px' }}>
      <div style={rowLabel}>{label}</div>
      <div style={rowValue}>{value}</div>
    </div>
  ) : null

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <header className="title-band" style={{ height: '144px', boxSizing: 'border-box' }}>
        <div style={{ ...col, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate('/admin/artists')} aria-label="Back" style={{
            width: '44px', height: '44px', flex: 'none', borderRadius: '50%', background: 'var(--light-blush)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QIcon name="chevron-left" size={18} />
          </button>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '24px' }}>
            {a ? (a.artistName || a.user.displayName) : 'Application'}
          </h1>
        </div>
      </header>

      <div style={{ ...col, marginTop: '18px' }}>
        {error && <p style={{ fontFamily: 'var(--font-body)' }}>{error}</p>}
        {!a && !error && <p className="on-paper" style={{ fontFamily: 'var(--font-body)' }}>Loading…</p>}

        {a && (
          <>
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-body)', padding: '4px 10px',
                  borderRadius: '10px', background: a.status === 'APPROVED' ? 'var(--highlight)' : a.status === 'DECLINED' ? 'var(--error-pale)' : 'var(--light-blush)',
                }}>{a.status}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>
                  applied {new Date(a.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {field('Name they sell under', a.artistName)}
              {field('Account', <>@{a.user.username} · {a.user.displayName} · {a.user.email}</>)}
              {field('City', a.city)}
              {field('Phone', a.phone)}
              {field('Bio', a.bio)}
              {field('Links', (
                <>
                  {a.instagram && <a href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)' }}>@{a.instagram}</a>}
                  {a.instagram && a.portfolioUrl ? ' · ' : ''}
                  {a.portfolioUrl && <a href={a.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)' }}>{a.portfolioUrl}</a>}
                </>
              ))}
              {field('Confirmed the work is theirs', a.rightsConfirmed ? 'Yes' : 'NO — they did not tick it')}
              {a.status === 'APPROVED' && field('Since approved', `${a.cardsSent} card${a.cardsSent === 1 ? '' : 's'} sent · $${(a.earnedCents / 100).toFixed(2)} earned`)}
              {a.reviewNote && field('Your note', a.reviewNote)}
            </div>

            {!!a.sampleUploadIds?.length && (
              <div style={panel}>
                <div style={{ ...rowLabel, marginBottom: '10px' }}>Sample artwork ({a.sampleUploadIds.length})</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                  {a.sampleUploadIds.map((u: string) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="" style={{ width: '100%', borderRadius: '10px', border: '1.5px solid var(--outline)', display: 'block' }} />
                    </a>
                  ))}
                </div>
                <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-body)', fontSize: '12px' }}>Tap any piece to open it full size.</p>
              </div>
            )}

            {a.idUploadId && (
              <div style={panel}>
                <div style={{ ...rowLabel, marginBottom: '10px' }}>Photo ID — deleted the moment you decide</div>
                <a href={a.idUploadId} target="_blank" rel="noreferrer">
                  <img src={a.idUploadId} alt="" style={{ width: '100%', maxWidth: '420px', borderRadius: '10px', border: '1.5px solid var(--outline)', display: 'block' }} />
                </a>
              </div>
            )}

            {!!a.cards?.length && (
              <div style={panel}>
                <div style={{ ...rowLabel, marginBottom: '10px' }}>Their cards</div>
                {a.cards.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                    <img src={c.uploadId} alt="" style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid var(--outline)' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                      <strong>{c.title}</strong><br />{c.status} · {c.width ?? '?'} × {c.height ?? '?'} · sent {c.sentCount}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {a.status === 'PENDING' && (
              <div style={panel}>
                <div style={{ ...rowLabel, marginBottom: '6px' }}>Note (optional, kept on the application)</div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything you want to remember about this decision"
                  style={{
                    width: '100%', border: '1.5px solid var(--outline)', borderRadius: '12px', padding: '10px 12px',
                    background: 'var(--paper)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)',
                  }}
                />
                <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                  <button disabled={busy} onClick={() => decide(true)} style={btn('var(--highlight)')}>APPROVE</button>
                  <button disabled={busy} onClick={() => decide(false)} style={btn('var(--card)')}>DECLINE</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
