import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import QIcon from '../../components/QIcon'

// Emerald's review desk (she asked for it in BOTH places, Oct 26): this is
// the in-app one, same endpoints as the web admin page. Applications first,
// then cards waiting, then who she owes money to.

const col: React.CSSProperties = {
  width: '100%', maxWidth: '640px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box',
}
const card: React.CSSProperties = {
  background: 'var(--card)', border: '1.5px solid var(--outline)', borderRadius: '18px',
  padding: '14px', marginBottom: '12px', boxShadow: 'var(--shadow-card)',
}
const btn = (fill: string): React.CSSProperties => ({
  height: '40px', padding: '0 18px', borderRadius: '20px', border: '2px solid var(--outline)',
  background: fill, color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '13px',
  fontWeight: 700, letterSpacing: '0.08em', textIndent: '0.08em', cursor: 'pointer',
})

export default function AdminArtistsPage() {
  const navigate = useNavigate()
  const [apps, setApps] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [owed, setOwed] = useState<any[]>([])
  const [roster, setRoster] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // She could only ever see PENDING, so anything she had already decided
  // vanished and looked lost (Emerald, Oct 26).
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'DECLINED' | 'ALL'>('PENDING')

  async function load() {
    setLoading(true)
    try {
      const [a, c, o, r] = await Promise.all([
        api.get(`/admin/artists/applications?status=${filter}`),
        api.get('/admin/artists/cards?status=IN_REVIEW'),
        api.get('/admin/artists/earnings'),
        api.get('/admin/artists/applications?status=APPROVED'),
      ])
      setApps(a.data.data ?? [])
      setCards(c.data.data ?? [])
      setOwed(o.data.data ?? [])
      setRoster(r.data.data ?? [])
      setError('')
    } catch (err: any) {
      setError(err?.response?.status === 403 ? 'This account is not an admin.' : "Couldn't load the review desk.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function decideArtist(id: string, approve: boolean) {
    await api.post(`/admin/artists/${id}/decision`, { approve }).catch(() => {})
    load()
  }
  async function decideCard(id: string, approve: boolean) {
    await api.post(`/admin/artists/cards/${id}/decision`, { approve }).catch(() => {})
    load()
  }
  const month = new Date().toISOString().slice(0, 7)   // "2026-10"

  async function toggleFeatured(artistId: string) {
    const current = roster.filter((a) => a.featuredMonth === month).sort((x, y) => (x.featuredOrder ?? 0) - (y.featuredOrder ?? 0)).map((a) => a.id)
    const next = current.includes(artistId) ? current.filter((id) => id !== artistId) : [...current, artistId]
    if (next.length > 5) { setError('Five featured artists a month, no more.'); return }
    setError('')
    await api.post('/admin/artists/featured', { month, artistIds: next }).catch(() => {})
    load()
  }

  async function markPaid(artistId: string) {
    await api.post('/admin/artists/earnings/paid', { artistId }).catch(() => {})
    load()
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <header className="title-band" style={{ height: '144px', boxSizing: 'border-box' }}>
        <div style={{ ...col, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(-1)} aria-label="Back" style={{
            width: '44px', height: '44px', flex: 'none', borderRadius: '50%', background: 'var(--light-blush)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QIcon name="chevron-left" size={18} />
          </button>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px' }}>Artist review</h1>
        </div>
      </header>

      <div style={{ ...col, marginTop: '18px' }}>
        {error && <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px' }}>{error}</p>}
        {loading && <p className="on-paper" style={{ fontFamily: 'var(--font-body)', fontSize: '15px' }}>Loading…</p>}

        <h2 className="on-paper" style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '20px' }}>
          Applications {apps.length ? `(${apps.length})` : ''}
        </h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {(['PENDING', 'APPROVED', 'DECLINED', 'ALL'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              height: '34px', padding: '0 14px', borderRadius: '17px', cursor: 'pointer',
              border: '1.5px solid var(--outline)',
              background: filter === f ? 'var(--btn)' : 'var(--card)',
              color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.08em', textIndent: '0.08em',
            }}>{f}</button>
          ))}
        </div>
        {!loading && !apps.length && <p className="on-paper" style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '20px' }}>Nothing waiting.</p>}
        {apps.map((a) => (
          <div key={a.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/admin/artists/${a.id}`)}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong style={{ fontFamily: 'var(--font-body)', fontSize: '16px' }}>{a.artistName || a.user.displayName}</strong>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>@{a.user.username}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: '13px' }}>{a.city}</span>
            </div>
            <p style={{ margin: '8px 0', fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: '18px' }}>{a.bio}</p>
            <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
              {a.instagram ? <a href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)' }}>@{a.instagram}</a> : null}
              {a.instagram && a.portfolioUrl ? ' · ' : ''}
              {a.portfolioUrl ? <a href={a.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)' }}>portfolio</a> : null}
              {a.phone ? ` · ${a.phone}` : ''}
            </p>
            {a.idUploadId && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700 }}>Photo ID (deleted when you decide)</span>
                <a href={a.idUploadId} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '4px' }}>
                  <img src={a.idUploadId} alt="" style={{ width: '160px', borderRadius: '8px', border: '1.5px solid var(--outline)' }} />
                </a>
              </div>
            )}
            {!!a.sampleUploadIds?.length && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {a.sampleUploadIds.map((u: string) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                    <img src={u} alt="" style={{ width: '72px', height: '96px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid var(--outline)' }} />
                  </a>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {a.status === 'PENDING' ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); decideArtist(a.id, true) }} style={btn('var(--highlight)')}>APPROVE</button>
                  <button onClick={(e) => { e.stopPropagation(); decideArtist(a.id, false) }} style={btn('var(--card)')}>DECLINE</button>
                </>
              ) : (
                <span style={{
                  fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-body)', padding: '4px 10px', borderRadius: '10px',
                  background: a.status === 'APPROVED' ? 'var(--highlight)' : 'var(--error-pale)',
                }}>{a.status}</span>
              )}
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: '12px' }}>Open ›</span>
            </div>
          </div>
        ))}

        <h2 className="on-paper" style={{ margin: '24px 0 10px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '20px' }}>
          Cards waiting {cards.length ? `(${cards.length})` : ''}
        </h2>
        {!loading && !cards.length && <p className="on-paper" style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '20px' }}>Nothing waiting.</p>}
        {cards.map((c) => (
          <div key={c.id} style={{ ...card, display: 'flex', gap: '12px', alignItems: 'center' }}>
            <img src={c.uploadId} alt="" style={{ width: '72px', height: '96px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid var(--outline)', flex: 'none' }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '15px' }}>{c.title}</strong>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>
                @{c.artist?.user?.username} · {c.width ?? '?'} × {c.height ?? '?'}
              </span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => decideCard(c.id, true)} style={btn('var(--highlight)')}>APPROVE</button>
              <button onClick={() => decideCard(c.id, false)} style={btn('var(--card)')}>REJECT</button>
            </span>
          </div>
        ))}

        <h2 className="on-paper" style={{ margin: '24px 0 10px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '20px' }}>
          Your artists {roster.length ? `(${roster.length})` : ''}
        </h2>
        {!loading && !roster.length && <p className="on-paper" style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '20px' }}>Nobody approved yet.</p>}
        {roster.map((a) => {
          const live = (a.cards ?? []).filter((c: any) => c.status === 'APPROVED').length
          const waiting = (a.cards ?? []).filter((c: any) => c.status === 'IN_REVIEW').length
          const featured = a.featuredMonth === month
          return (
            <div key={a.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/admin/artists/${a.id}`)}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <strong style={{ fontFamily: 'var(--font-body)', fontSize: '16px' }}>{a.artistName || a.user.displayName}</strong>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>@{a.user.username}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: '13px' }}>{a.city}</span>
              </div>
              <p style={{ margin: '6px 0 10px', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
                {live} card{live === 1 ? '' : 's'} in the shop
                {waiting ? ` · ${waiting} waiting on you` : ''}
                {a.paypalEmail ? ` · ${a.paypalEmail}` : ' · no PayPal address yet'}
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFeatured(a.id) }}
                  style={btn(featured ? 'var(--highlight)' : 'var(--card)')}
                >{featured ? 'FEATURED THIS MONTH' : 'FEATURE THIS MONTH'}</button>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: '12px' }}>Open ›</span>
              </div>
            </div>
          )
        })}

        <h2 className="on-paper" style={{ margin: '24px 0 10px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '20px' }}>Owed to artists</h2>
        {!loading && !owed.length && <p className="on-paper" style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>Nothing owed yet.</p>}
        {owed.map((o) => (
          <div key={o.artist?.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '15px' }}>
                @{o.artist?.user?.username} · ${(o.owedCents / 100).toFixed(2)}
              </strong>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>
                {o.cardsSent} card{o.cardsSent === 1 ? '' : 's'} · {o.artist?.paypalEmail ?? 'no PayPal address yet'}
              </span>
            </span>
            <button onClick={() => markPaid(o.artist?.id)} style={btn('var(--btn)')}>MARK PAID</button>
          </div>
        ))}
      </div>
    </div>
  )
}
