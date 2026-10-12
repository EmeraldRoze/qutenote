import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import TabBar from '../components/TabBar'
import QEmoji from '../components/QEmoji'
import { enableReminders, remindersEnabled, lastReminderFailure } from '../lib/push'
import { isNativeApp } from '../lib/native'

interface ImportantDate {
  id: string
  connectionName: string
  label: string
  month: number
  day: number
  year: number | null
  reminderDaysBefore: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LABELS = ['Birthday', 'Anniversary', 'Graduation', 'Other']
const LABEL_ART: Record<string, string> = { Birthday: 'cake', Anniversary: 'hearteyes', Graduation: 'popper', Other: 'star' }
const artForLabel = (l: string) => LABEL_ART[l] ?? 'star'

const cardStyle = {
  background: 'var(--white)',
  borderRadius: '20px',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-card)',
  padding: '20px',
}

const inputStyle = {
  width: '100%', padding: '11px 16px', fontSize: '14px',
  borderRadius: '10px', border: '1.5px solid var(--border-default)',
  background: 'var(--white)', color: 'var(--ink)',
  outline: 'none', fontFamily: 'var(--font-body)',
}

export default function ImportantDatesPage() {
  const navigate = useNavigate()
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'working' | 'denied' | 'failed'>('idle')
  const [name, setName] = useState('')
  const [label, setLabel] = useState('Birthday')
  const [month, setMonth] = useState(1)
  const [day, setDay] = useState(1)
  const [saving, setSaving] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [annual, setAnnual] = useState(true)
  const [formError, setFormError] = useState('')
  const [friends, setFriends] = useState<{ id: string; displayName: string }[]>([])

  useEffect(() => {
    api.get('/important-dates')
      .then((res) => setDates(res.data.data))
      .finally(() => setLoading(false))
    api.get('/connections').then((res) => setFriends(res.data.data)).catch(() => {})
  }, [])

  async function handleAdd() {
    if (!name.trim()) {
      setFormError("Add who it's for — a name or nickname up top.")
      return
    }
    if (label === 'Other' && !customLabel.trim()) {
      setFormError("Tell us what the date is for, or pick one of the types.")
      return
    }
    setFormError('')
    setSaving(true)
    try {
      // Annual dates have no year; one-time dates remember which year is next.
      const now = new Date()
      const nextYear = new Date(now.getFullYear(), month - 1, day) < now ? now.getFullYear() + 1 : now.getFullYear()
      const res = await api.post('/important-dates', {
        connectionName: name.trim(),
        label: label === 'Other' ? customLabel.trim() : label,
        month,
        day,
        year: annual ? null : nextYear,
      })
      setDates((prev) => [...prev, res.data.data])
      setName('')
      setCustomLabel('')
      setMonth(1)
      setDay(1)
      setAnnual(true)
      setShowForm(false)
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? "That didn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/important-dates/${id}`)
      setDates((prev) => prev.filter((d) => d.id !== id))
    } catch {
      // error
    }
  }


  function isUpcoming(d: ImportantDate) {
    const now = new Date()
    const thisYear = now.getFullYear()
    const dateThisYear = new Date(thisYear, d.month - 1, d.day)
    if (dateThisYear < now) dateThisYear.setFullYear(thisYear + 1)
    const diffDays = Math.ceil((dateThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 30
  }

  const sorted = [...dates].sort((a, b) => {
    const now = new Date()
    const year = now.getFullYear()
    const aDate = new Date(year, a.month - 1, a.day)
    const bDate = new Date(year, b.month - 1, b.day)
    if (aDate < now) aDate.setFullYear(year + 1)
    if (bDate < now) bDate.setFullYear(year + 1)
    return aDate.getTime() - bDate.getTime()
  })

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '110px' }}>
      <nav style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--lavender-pale)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => navigate('/home')} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--lavender-dark)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Home
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, color: 'var(--ink)' }}>
          Important Dates
        </h1>
        <div style={{ width: '60px' }} />
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {isNativeApp && !remindersEnabled() && (
          <div style={{ marginBottom: '14px' }}>
            <button
              disabled={reminderStatus === 'working'}
              onClick={async () => {
                setReminderStatus('working')
                const r = await enableReminders()
                if (r === 'on') { window.location.reload(); return }
                setReminderStatus(r)
              }}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '12px',
                border: '1.5px dashed var(--lavender-soft)', background: 'var(--lavender-pale)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '13px', color: '#5A32D6', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                opacity: reminderStatus === 'working' ? 0.6 : 1,
              }}
            >
              {reminderStatus === 'working' ? 'Turning on…' : "Turn on reminders — we'll buzz you 7 days before"}
            </button>
            {reminderStatus === 'denied' && (
              <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-soft, #766E82)', textAlign: 'center' }}>
                Notifications are off for QuteNote in your iPhone Settings. Open Settings → QuteNote → Notifications and allow them, then try again.
              </p>
            )}
            {reminderStatus === 'failed' && (
              <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-soft, #766E82)', textAlign: 'center' }}>
                Hmm, that didn't go through. Check your connection and try again in a moment.
                {lastReminderFailure() && <><br /><span style={{ opacity: 0.6 }}>({lastReminderFailure()})</span></>}
              </p>
            )}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            width: '100%', padding: '14px', fontSize: '14px', fontWeight: 500,
            borderRadius: '50px', border: '1.5px solid var(--lavender-light)',
            cursor: 'pointer', background: 'var(--white)', color: 'var(--lavender-dark)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {showForm ? 'Cancel' : '+ Add an important date'}
        </button>

        {/* Add form */}
        {showForm && (
          <div style={cardStyle}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>Who is it for?</p>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom, best friend Sarah..."
              maxLength={100}
            />
            {name.length >= 1 && friends.filter((f) => f.displayName.toLowerCase().includes(name.toLowerCase()) && f.displayName !== name).length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {friends.filter((f) => f.displayName.toLowerCase().includes(name.toLowerCase()) && f.displayName !== name).slice(0, 4).map((f) => (
                  <button key={f.id} onClick={() => setName(f.displayName)} style={{
                    fontSize: '12px', padding: '6px 12px', borderRadius: '50px', cursor: 'pointer',
                    border: '1px solid var(--lavender-light)', background: 'var(--lavender-pale)',
                    color: 'var(--ink)', fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: 0, fontWeight: 400,
                  }}>{f.displayName}</button>
                ))}
              </div>
            )}

            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px', marginTop: '14px' }}>What kind of date?</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {LABELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLabel(l)}
                  style={{
                    fontSize: '12px', fontWeight: 500, padding: '6px 14px',
                    borderRadius: '50px', border: 'none', cursor: 'pointer',
                    background: label === l ? 'var(--lavender)' : 'var(--lavender-pale)',
                    color: label === l ? '#fff' : 'var(--lavender-dark)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <QEmoji name={artForLabel(l)} size={14} style={{ marginRight: '4px' }} />{l}
                </button>
              ))}
            </div>

            {label === 'Other' && (
              <input
                style={{ ...inputStyle, marginTop: '10px' }}
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="What's the date for?"
                maxLength={50}
              />
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>Month</p>
                <select
                  style={inputStyle}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>Day</p>
                <select
                  style={inputStyle}
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', cursor: 'pointer', fontSize: '13px', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={annual}
                onChange={(e) => setAnnual(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#5A32D6' }}
              />
              Every year — remind me annually
            </label>

            <button
              onClick={handleAdd}
              disabled={saving}
              style={{
                marginTop: '16px', width: '100%', padding: '12px', fontSize: '14px', fontWeight: 500,
                borderRadius: '50px', border: 'none',
                cursor: saving ? 'default' : 'pointer',
                background: 'var(--lavender)', color: '#fff',
                opacity: saving ? 0.7 : 1,
                fontFamily: 'var(--font-body)',
              }}
            >
              {saving ? 'Saving...' : 'Save Date'}
            </button>
            {formError && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: '#B3261E', textAlign: 'center' }}>
                {formError}
              </p>
            )}
          </div>
        )}

        {/* Dates list */}
        {loading && <p style={{ fontSize: '13px', color: 'var(--ink-muted)', textAlign: 'center', padding: '24px' }}>Loading...</p>}

        {!loading && sorted.length === 0 && !showForm && (
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-handwriting)', fontSize: '12px' }}>
              No dates saved yet. Never miss a birthday again!
            </p>
          </div>
        )}

        {!loading && sorted.map((d) => (
          <div key={d.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '12px',
                background: isUpcoming(d) ? 'var(--blush-pale)' : 'var(--lavender-pale)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  {MONTHS[d.month - 1]}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
                  {d.day}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>{d.connectionName}</p>
                <p style={{ fontSize: '12px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <QEmoji name={artForLabel(d.label)} size={14} />{d.label}{isUpcoming(d) && ' — coming up!'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDelete(d.id)}
              style={{ fontSize: '12px', color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <TabBar />
    </div>
  )
}
