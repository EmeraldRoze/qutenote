import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import TabBar from '../components/TabBar'
import QEmoji from '../components/QEmoji'
import { enableReminders, remindersEnabled, lastReminderFailure } from '../lib/push'
import { isNativeApp } from '../lib/native'
import { contactsAvailable, readContacts, contactsWithBirthdays } from '../lib/contacts'
import type { DeviceContact } from '../lib/contacts'

// Dates tab, palette 4 restyle (screens/13-dates.html)

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
const LABEL_ART: Record<string, string> = {
  'Birthday': 'cake',
  'Anniversary': 'party',
  'Hard day': 'crying',
  'Pet-iversary': 'heart',
  'Tiny Triumphs': 'star',
  'Sweet Traditions': 'gift',
  'Seasonal Feels': 'sun',
  'Graduation': 'popper', // legacy label from the old form
}
// Labels can carry a detail ("Tiny Triumphs: parallel parked") — match the prefix
const artForLabel = (l: string) => LABEL_ART[l] ?? LABEL_ART[l.split(':')[0]] ?? 'thought-bubble'

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

const whiteCard: React.CSSProperties = {
  background: 'var(--card)',
  border: '1.5px solid var(--stone)',
  borderRadius: '18px',
}

export default function ImportantDatesPage() {
  const navigate = useNavigate()
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [loading, setLoading] = useState(true)

  // Reminders switch — keeps the existing device-token registration flow
  const [remindersOn, setRemindersOn] = useState(remindersEnabled())
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'working' | 'denied' | 'failed' | 'web' | 'offhelp'>('idle')

  // "Pull birthdays from contacts" (native app only)
  const [contactsState, setContactsState] = useState<'idle' | 'loading' | 'denied' | 'ready'>('idle')
  const [contactBdays, setContactBdays] = useState<DeviceContact[]>([])
  const [contactsChecked, setContactsChecked] = useState(0)
  const [contactsError, setContactsError] = useState('')
  const [addingContact, setAddingContact] = useState<string | null>(null)

  useEffect(() => {
    api.get('/important-dates')
      .then((res) => setDates(res.data.data))
      .finally(() => setLoading(false))
  }, [])

  async function handleReminderToggle() {
    if (reminderStatus === 'working') return
    if (remindersOn) {
      // No unregister endpoint yet; point at iPhone Settings instead of lying.
      setReminderStatus('offhelp')
      return
    }
    if (!isNativeApp) {
      setReminderStatus('web')
      return
    }
    setReminderStatus('working')
    const r = await enableReminders()
    if (r === 'on') {
      setRemindersOn(true)
      setReminderStatus('idle')
    } else {
      setReminderStatus(r)
    }
  }

  async function handlePullContacts() {
    if (contactsState === 'loading') return
    setContactsState('loading')
    try {
      const contacts = await readContacts()
      if (!contacts) { setContactsState('denied'); return }
      setContactsChecked(contacts.length)
      setContactBdays(contactsWithBirthdays(contacts).sort((a, b) => a.name.localeCompare(b.name)))
      setContactsState('ready')
    } catch (err: any) {
      setContactsError(String(err?.message ?? err ?? ''))
      setContactsState('denied')
    }
  }

  async function handleAddContact(c: DeviceContact) {
    if (!c.birthday || addingContact) return
    setAddingContact(c.name)
    try {
      const res = await api.post('/important-dates', {
        connectionName: c.name,
        label: 'Birthday',
        month: c.birthday.month,
        day: c.birthday.day,
        year: null,
      })
      setDates((prev) => [...prev, res.data.data])
    } catch {
      // leave the row so she can try again
    } finally {
      setAddingContact(null)
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

  const sorted = useMemo(
    () => [...dates].sort((a, b) => daysUntil(a.month, a.day) - daysUntil(b.month, b.day)),
    [dates],
  )

  const savedNames = useMemo(
    () => new Set(dates.map((d) => d.connectionName.toLowerCase())),
    [dates],
  )

  // Contacts already added disappear from the pull-in list (Emerald, Oct 18)
  const [contactsOpen, setContactsOpen] = useState(true)
  const remainingBdays = useMemo(
    () => contactBdays.filter((c) => !savedNames.has(c.name.toLowerCase())),
    [contactBdays, savedNames],
  )

  const quickAdd: { chip: string; to: string }[] = [
    { chip: '+ Birthday', to: '/dates/add?type=Birthday' },
    { chip: '+ Anniversary', to: '/dates/add?type=Anniversary' },
    { chip: '+ Pet-iversary', to: '/dates/add?type=' + encodeURIComponent('Pet-iversary') },
    { chip: '+ Tiny Triumphs', to: '/dates/add?type=' + encodeURIComponent('Tiny Triumphs') },
    { chip: '+ Sweet Traditions', to: '/dates/add?type=' + encodeURIComponent('Sweet Traditions') },
    { chip: '+ Seasonal Feels', to: '/dates/add?type=' + encodeURIComponent('Seasonal Feels') },
    { chip: '+ Hard day', to: '/dates/add?type=' + encodeURIComponent('Hard day') },
  ]

  const hint: React.CSSProperties = {
    marginTop: '8px', fontSize: '12px', color: 'var(--ink-muted)', textAlign: 'center',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      <style>{'.qn-chips::-webkit-scrollbar{display:none}'}</style>

      {/* Title band — clear header space, 144px keeps the 36px ruling rhythm */}
      <header className="title-band" style={{ height: '144px' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Important dates
          </h1>
          <button onClick={() => navigate('/dates/add')} aria-label="Add a date" style={{
            width: '44px', height: '44px', borderRadius: '50%', border: '2px solid var(--stone)', flex: 'none', boxSizing: 'border-box',
            background: 'var(--btn)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>

        {/* Reminders */}
        <div style={{ ...whiteCard, marginTop: '20px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span aria-hidden style={{
            width: '44px', height: '44px', flex: 'none', borderRadius: '50%',
            background: 'var(--lime)', border: '1.5px solid var(--stone)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>Reminders</span>
            <span style={{ fontSize: '14px', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>We'll buzz you 7 days before.</span>
          </span>
          <button
            role="switch"
            aria-checked={remindersOn}
            aria-label="Reminders"
            onClick={handleReminderToggle}
            disabled={reminderStatus === 'working'}
            style={{
              width: '52px', height: '32px', flex: 'none', borderRadius: '16px',
              border: '1.5px solid var(--stone)', background: remindersOn ? 'var(--lime)' : '#D9CFC2',
              position: 'relative', padding: 0, cursor: 'pointer',
              opacity: reminderStatus === 'working' ? 0.6 : 1,
            }}
          >
            <span style={{
              position: 'absolute', top: '2px', left: remindersOn ? '22px' : '2px',
              width: '25px', height: '25px', borderRadius: '50%', background: 'var(--card)',
              border: '1.5px solid var(--stone)', boxSizing: 'border-box', transition: 'left 0.15s ease',
            }} />
          </button>
        </div>
        {reminderStatus === 'working' && <p style={hint}>Turning on…</p>}
        {reminderStatus === 'web' && <p style={hint}>Reminders come with the QuteNote iPhone app.</p>}
        {reminderStatus === 'offhelp' && (
          <p style={hint}>Reminders are on for this phone. To turn them off, open Settings → QuteNote → Notifications.</p>
        )}
        {reminderStatus === 'denied' && (
          <p style={hint}>Notifications are off for QuteNote in your iPhone Settings. Open Settings → QuteNote → Notifications and allow them, then try again.</p>
        )}
        {reminderStatus === 'failed' && (
          <p style={hint}>
            Hmm, that didn't go through. Check your connection and try again in a moment.
            {lastReminderFailure() && <><br /><span style={{ opacity: 0.6 }}>({lastReminderFailure()})</span></>}
          </p>
        )}

        {/* Empty state, or the dates sorted by whichever comes next */}
        {loading ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)', textAlign: 'center', padding: '24px 0 6px' }}>
            Fetching your dates…
          </p>
        ) : sorted.length === 0 ? (
          <div className="rose-paper" style={{
            marginTop: '18px', borderRadius: '26px', padding: '26px 20px 22px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          }}>
            <QEmoji name="cake" size={110} style={{ height: 'auto', transform: 'rotate(-4deg)' }} />
            <h2 style={{ margin: '14px 0 0', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '22px', lineHeight: 1.2, color: 'var(--ink)' }}>
              Never miss a birthday again.
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: '15px', lineHeight: 1.45, color: 'var(--ink)', maxWidth: '280px', fontFamily: 'var(--font-body)' }}>
              Add the days that matter and we'll give you a little nudge.
            </p>
            <button onClick={() => navigate('/dates/add')} style={{
              marginTop: '18px', width: '100%', height: '56px', border: '2px solid var(--stone)', borderRadius: '28px',
              background: 'var(--btn)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '16px',
              fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+ ADD A DATE</button>
          </div>
        ) : (
          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sorted.map((d) => {
              const days = daysUntil(d.month, d.day)
              return (
                <div key={d.id} style={{ ...whiteCard, padding: '10px 10px 10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <QEmoji name={artForLabel(d.label)} size={36} style={{ flex: 'none', height: 'auto' }} />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.connectionName}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
                      {d.label} · {MONTHS[d.month - 1]} {d.day}
                    </span>
                  </span>
                  <span style={{
                    padding: '5px 11px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                    fontFamily: 'var(--font-body)', letterSpacing: '0.04em', whiteSpace: 'nowrap', flex: 'none',
                    background: days <= 7 ? 'var(--lime)' : '#E3D5CC',
                    border: '1.5px solid var(--stone)', boxSizing: 'border-box',
                    color: 'var(--ink)',
                  }}>{countdownLabel(days)}</span>
                  <button onClick={() => handleDelete(d.id)} aria-label={`Remove ${d.connectionName}`} style={{
                    width: '34px', height: '34px', flex: 'none', borderRadius: '50%', border: 'none',
                    background: 'transparent', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: '15px',
                  }}>✕</button>
                </div>
              )
            })}
          </div>
        )}

        {/* Quick add */}
        <h2 style={{ margin: '26px 0 10px', fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '18px', color: 'var(--ink)' }}>Quick add</h2>
        <div className="qn-chips" style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -20px', padding: '0 20px' }}>
          {quickAdd.map((q) => (
            <button key={q.chip} onClick={() => navigate(q.to)} style={{
              flex: 'none', display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 16px',
              borderRadius: '22px', border: '1.5px solid var(--stone)', background: 'var(--card)',
              fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)',
              cursor: 'pointer', textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap',
            }}>{q.chip}</button>
          ))}
          <span aria-hidden style={{ flex: 'none', width: '12px' }} />
        </div>

        {/* Pull birthdays from contacts — native app only */}
        {contactsAvailable && contactsState !== 'ready' && (
          <button onClick={handlePullContacts} style={{
            ...whiteCard, marginTop: '20px', width: '100%', minHeight: '72px',
            display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px',
            fontFamily: 'var(--font-body)', textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
            textTransform: 'none', letterSpacing: 0,
            opacity: contactsState === 'loading' ? 0.6 : 1,
          }}>
            <QEmoji name="bff" size={48} style={{ flex: 'none', height: 'auto' }} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>
                {contactsState === 'loading' ? 'Reading your contacts…' : 'Pull birthdays from contacts'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 400 }}>Fill this page in one tap</span>
            </span>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
        {contactsState === 'denied' && (
          <p style={hint}>QuteNote can't see your contacts{contactsError ? ` (${contactsError})` : ''}. Open Settings → QuteNote → Contacts and allow access, then try again.</p>
        )}
        {contactsState === 'ready' && (
          <div style={{ marginTop: '20px' }}>
            {/* Collapsible header — the little caret, per Emerald (Oct 18) */}
            <button
              onClick={() => setContactsOpen((o) => !o)}
              aria-expanded={contactsOpen}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: 0,
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                textTransform: 'none', letterSpacing: 0,
              }}
            >
              <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '18px', color: 'var(--ink)' }}>Birthdays in your contacts</h2>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: contactsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <p style={{ margin: '2px 0 10px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-muted)' }}>
              Checked {contactsChecked} contact{contactsChecked === 1 ? '' : 's'} · {remainingBdays.length} left to add
            </p>
            {!contactsOpen ? null : remainingBdays.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-muted)' }}>
                {contactBdays.length > 0
                  ? 'All caught up, every contact birthday is already in your dates. 🎉'
                  : 'None of them have a birthday saved on their contact card. Add birthdays in your Contacts app, or add dates here by hand.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {remainingBdays.map((c) => {
                  return (
                    <div key={c.name} style={{ ...whiteCard, padding: '10px 10px 10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <QEmoji name="cake" size={32} style={{ flex: 'none', height: 'auto' }} />
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
                          Birthday · {MONTHS[c.birthday!.month - 1]} {c.birthday!.day}
                        </span>
                      </span>
                      <button
                        disabled={addingContact === c.name}
                        onClick={() => handleAddContact(c)}
                        style={{
                          height: '34px', padding: '0 14px', borderRadius: '999px', flex: 'none',
                          border: '1.5px solid var(--stone)', cursor: 'pointer',
                          background: 'var(--card)', color: 'var(--ink)',
                          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em',
                          opacity: addingContact === c.name ? 0.6 : 1,
                        }}
                      >
                        {addingContact === c.name ? 'Adding…' : '+ Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <TabBar />
    </div>
  )
}
