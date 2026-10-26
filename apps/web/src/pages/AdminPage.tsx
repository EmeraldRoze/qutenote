import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface LaunchSignup { id: string; email: string; name: string | null; source: string | null; createdAt: string }

// The launch list as a spreadsheet file, built right in the browser —
// opens in Numbers, Excel, or Google Sheets.
function downloadLaunchSheet(rows: LaunchSignup[]) {
  const esc = (v: string | null) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const csv = ['Name,Email,Signed up,Where from', ...rows.map((r) =>
    [esc(r.name), esc(r.email), esc(r.createdAt.slice(0, 10)), esc(r.source)].join(','),
  )].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'qutenote-launch-list.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface NoteItem {
  id: string
  noteText: string
  occasionType: string
  fontChoice: string
  status: string
  lobNoteId: string | null
  createdAt: string
  sentAt: string | null
  sender: { id: string; displayName: string; username: string }
  recipient: { id: string; displayName: string; username: string }
}

const statusColors: Record<string, string> = {
  PENDING: 'var(--blush)',
  PRINTED: '#BADAFF',
  SENT: '#EEFC4E',
  FAILED: 'var(--error-pale)',
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [signups, setSignups] = useState<LaunchSignup[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    if (user && !user.isAdmin) navigate('/home')
  }, [user, navigate])

  useEffect(() => {
    api.get('/admin/notes')
      .then((res) => setNotes(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/admin/early-access')
      .then((res) => setSignups(res.data.data))
      .catch(() => {})
  }, [])

  async function updateStatus(noteId: string, status: string) {
    setUpdating(noteId)
    try {
      const res = await api.patch(`/admin/notes/${noteId}/status`, { status })
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, ...res.data.data } : n))
    } catch {
      alert('Failed to update status.')
    }
    setUpdating(null)
  }

  const filtered = filter === 'ALL' ? notes : notes.filter((n) => n.status === filter)

  if (!user?.isAdmin) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Nav */}
      <nav style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--lavender-pale)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 300, color: 'var(--lavender-deep)' }}>
          QuteNote Admin
        </h1>
      <button onClick={() => (window.location.href = '/admin/analytics')} style={{
        marginTop: '10px', height: '40px', padding: '0 16px', borderRadius: '20px', cursor: 'pointer',
        border: '2px solid #B4897A', background: '#FBF8F3', color: '#4A2424',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
      }}>USABILITY DASHBOARD →</button>
      {/* her review desk, same screen the app uses (Emerald, Oct 26) */}
      <button onClick={() => (window.location.href = '/admin/artists')} style={{
        marginTop: '10px', marginLeft: '8px', height: '40px', padding: '0 16px', borderRadius: '20px', cursor: 'pointer',
        border: '2px solid #B4897A', background: '#FBF8F3', color: '#4A2424',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
      }}>ARTIST REVIEW →</button>
        <button
          onClick={() => navigate('/home')}
          style={{ fontSize: '13px', color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Back to Home
        </button>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'PRINTED', 'SENT', 'FAILED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                border: filter === s ? '2px solid #B4897A' : '1.5px solid var(--border-default)',
                background: filter === s ? '#BADAFF' : 'var(--white)',
                color: filter === s ? '#4A2424' : 'var(--ink-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {s} {s !== 'ALL' && `(${notes.filter((n) => n.status === s).length})`}
              {s === 'ALL' && `(${notes.length})`}
            </button>
          ))}
        </div>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '40px 0' }}>Loading notes...</p>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '40px 0', fontFamily: 'var(--font-handwriting)', fontSize: '13px' }}>
            No notes here yet.
          </p>
        )}

        {filtered.map((note) => (
          <div key={note.id} style={{
            background: 'var(--white)',
            borderRadius: '16px',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
            padding: '20px',
            marginBottom: '12px',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                  {note.sender.displayName} → {note.recipient.displayName}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  {note.occasionType.replace('_', ' ')} · {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                background: statusColors[note.status] ?? 'var(--lavender-pale)',
                color: '#4A2424', border: '1.5px solid #B4897A',
              }}>
                {note.status}
              </span>
            </div>

            {/* Note text */}
            <p style={{
              fontSize: '14px', color: 'var(--ink)', lineHeight: '1.5',
              fontFamily: 'var(--font-handwriting)',
              padding: '12px 16px',
              background: 'var(--cream)',
              borderRadius: '12px',
              marginBottom: '12px',
            }}>
              {note.noteText}
            </p>

            {/* Meta */}
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '12px' }}>
              Font: {note.fontChoice}
              {note.lobNoteId && <> · Lob: {note.lobNoteId}</>}
              {note.sentAt && <> · Sent: {new Date(note.sentAt).toLocaleDateString()}</>}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const token = localStorage.getItem('cn_token')
                  window.open(`/api/admin/notes/${note.id}/pdf?token=${token}`, '_blank')
                }}
                style={{
                  padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                  border: '2px solid #B4897A', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  background: '#FBF8F3', color: '#4A2424',
                }}
              >
                Download PDF
              </button>
              {note.status === 'PENDING' && (
                <button
                  onClick={() => updateStatus(note.id, 'PRINTED')}
                  disabled={updating === note.id}
                  style={{
                    padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                    border: '2px solid #B4897A', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    background: '#BADAFF', color: '#4A2424',
                    opacity: updating === note.id ? 0.6 : 1,
                  }}
                >
                  Mark Printed
                </button>
              )}
              {(note.status === 'PENDING' || note.status === 'PRINTED') && (
                <button
                  onClick={() => updateStatus(note.id, 'SENT')}
                  disabled={updating === note.id}
                  style={{
                    padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                    border: '2px solid #B4897A', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    background: '#EEFC4E', color: '#4A2424',
                    opacity: updating === note.id ? 0.6 : 1,
                  }}
                >
                  Mark Sent
                </button>
              )}
              {note.status === 'PENDING' && (
                <button
                  onClick={() => updateStatus(note.id, 'FAILED')}
                  disabled={updating === note.id}
                  style={{
                    padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                    border: '1.5px solid var(--error)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    background: '#FBF8F3', color: 'var(--error)',
                    opacity: updating === note.id ? 0.6 : 1,
                  }}
                >
                  Mark Failed
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Launch list */}
        <div style={{ marginTop: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 300, color: 'var(--ink)' }}>
              Launch list ({signups.length})
            </h2>
            <button
              onClick={() => downloadLaunchSheet(signups)}
              disabled={!signups.length}
              style={{
                padding: '10px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 700,
                border: '2px solid #B4897A', background: '#BADAFF', color: '#4A2424',
                cursor: signups.length ? 'pointer' : 'default', fontFamily: 'var(--font-body)',
                opacity: signups.length ? 1 : 0.5,
              }}
            >
              Download spreadsheet
            </button>
          </div>
          {signups.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
              Nobody on the list yet. Share qutenote.com and watch this fill up.
            </p>
          ) : (
            <div style={{ background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '12px', overflow: 'hidden' }}>
              {signups.map((s, i) => (
                <div key={s.id} style={{
                  display: 'flex', gap: '12px', alignItems: 'baseline', padding: '12px 16px',
                  borderTop: i ? '1px solid var(--divider)' : 'none',
                  fontFamily: 'var(--font-body)', fontSize: '14px',
                }}>
                  <span style={{ fontWeight: 700, minWidth: '120px', color: 'var(--ink)' }}>{s.name ?? '—'}</span>
                  <span style={{ flex: 1, color: 'var(--ink-mid)', overflowWrap: 'anywhere' }}>{s.email}</span>
                  <span style={{ fontSize: '12px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{s.createdAt.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
