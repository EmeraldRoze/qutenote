import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import QEmoji from '../components/QEmoji'

// Add a date, palette 4 restyle (screens/14-add-a-date.html). No tab bar here.

const ROW = 34 // wheel row height, 5 rows visible

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// Max days per month (Feb 29 allowed; annual dates have no year)
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const TYPES: { key: string; chip: string; emoji: string; askOccasion?: boolean }[] = [
  { key: 'Birthday', chip: 'B-Day', emoji: 'cake' },
  { key: 'Anniversary', chip: 'Anniversary', emoji: 'party' },
  { key: 'Hard day', chip: 'Hard day', emoji: 'crying' },
  { key: 'Pet-iversary', chip: 'Pet-iversary', emoji: 'heart' },
  { key: 'Tiny Triumphs', chip: 'Tiny Triumphs', emoji: 'star', askOccasion: true },
  { key: 'Sweet Traditions', chip: 'Sweet Traditions', emoji: 'gift', askOccasion: true },
  { key: 'Seasonal Feels', chip: 'Seasonal Feels', emoji: 'sun', askOccasion: true },
  { key: 'Other', chip: 'Other', emoji: 'thought-bubble', askOccasion: true },
]

interface SearchResult { id: string; username: string; displayName: string }

const sectionLabel: React.CSSProperties = {
  margin: '20px 0 10px', fontSize: '13px', fontWeight: 700,
  color: 'var(--ink)', fontFamily: 'var(--font-body)',
}
const whiteCard: React.CSSProperties = {
  background: 'var(--card)', border: '1.5px solid var(--stone)', borderRadius: '18px',
}

// One scroll-snap wheel column. The highlight band is drawn by the parent.
function Wheel({ items, index, onChange, flex, label }: {
  items: string[]
  index: number
  onChange: (i: number) => void
  flex: number
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && Math.round(el.scrollTop / ROW) !== index) {
      el.scrollTop = index * ROW
    }
  }, [index, items.length])

  function handleScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW)))
    if (i !== index) onChange(i)
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="qn-wheel"
      role="listbox"
      aria-label={label}
      style={{
        flex, height: `${ROW * 5}px`, overflowY: 'auto', position: 'relative', zIndex: 1,
        scrollSnapType: 'y mandatory', scrollbarWidth: 'none',
      }}
    >
      <div aria-hidden style={{ height: `${ROW * 2}px` }} />
      {items.map((item, i) => {
        const d = Math.abs(i - index)
        return (
          <div
            key={item}
            role="option"
            aria-selected={i === index}
            onClick={() => onChange(i)}
            style={{
              height: `${ROW}px`, scrollSnapAlign: 'start',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-body)', color: 'var(--ink)', cursor: 'pointer',
              fontSize: d === 0 ? '19px' : d === 1 ? '16px' : '14px',
              fontWeight: d === 0 ? 700 : 400,
              opacity: d === 0 ? 1 : d === 1 ? 0.45 : 0.2,
            }}
          >
            {item}
          </div>
        )
      })}
      <div aria-hidden style={{ height: `${ROW * 2}px` }} />
    </div>
  )
}

export default function AddDatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Prefill contract from the Dates page: ?name=&month=&day=&type=&occasion=
  const typeParam = params.get('type')
  const matchedType = TYPES.find((t) => t.key.toLowerCase() === (typeParam ?? '').toLowerCase())
  const now = new Date()
  const prefillMonth = Number(params.get('month'))
  const prefillDay = Number(params.get('day'))

  const [name, setName] = useState(params.get('name') ?? '')
  const [type, setType] = useState(matchedType ? matchedType.key : typeParam ? 'Other' : 'Birthday')
  const [occasion, setOccasion] = useState(params.get('occasion') ?? (typeParam && !matchedType ? typeParam : ''))
  const [monthIndex, setMonthIndex] = useState(
    prefillMonth >= 1 && prefillMonth <= 12 ? prefillMonth - 1 : now.getMonth(),
  )
  const [dayIndex, setDayIndex] = useState(() => {
    const max = DAYS_IN_MONTH[prefillMonth >= 1 && prefillMonth <= 12 ? prefillMonth - 1 : now.getMonth()]
    return prefillDay >= 1 && prefillDay <= max ? prefillDay - 1 : Math.min(now.getDate(), max) - 1
  })
  const [everyYear, setEveryYear] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // QT search: the one field takes a QT or any free-typed name
  const [results, setResults] = useState<SearchResult[]>([])
  const [picked, setPicked] = useState(Boolean(params.get('name')))

  useEffect(() => {
    if (picked || name.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/users?q=${encodeURIComponent(name.trim())}`)
        setResults(res.data.data)
      } catch {
        setResults([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [name, picked])

  // Keep the day wheel inside the chosen month
  const dayCount = DAYS_IN_MONTH[monthIndex]
  useEffect(() => {
    if (dayIndex > dayCount - 1) setDayIndex(dayCount - 1)
  }, [dayCount, dayIndex])

  async function handleSave() {
    if (saving) return
    if (!name.trim()) {
      setFormError("Add who it's for, a name or nickname up top.")
      return
    }
    const typeDef = TYPES.find((t) => t.key === type)
    if (type === 'Other' && !occasion.trim()) {
      setFormError('Tell us what the date is for, or pick one of the types.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      // Annual dates have no year; one-time dates remember which year is next.
      const month = monthIndex + 1
      const day = dayIndex + 1
      const today = new Date()
      const nextYear = new Date(today.getFullYear(), month - 1, day) < today
        ? today.getFullYear() + 1
        : today.getFullYear()
      await api.post('/important-dates', {
        connectionName: name.trim(),
        // "Other" saves the custom occasion as the label; the named types keep
        // their name, with an optional detail folded in (Tiny Triumphs: parallel parking)
        label: type === 'Other'
          ? occasion.trim()
          : typeDef?.askOccasion && occasion.trim()
            ? `${type}: ${occasion.trim()}`
            : type,
        month,
        day,
        year: everyYear ? null : nextYear,
      })
      navigate('/dates')
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? "That didn't save. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{'.qn-wheel::-webkit-scrollbar{display:none}'}</style>

      {/* Title band — 216px keeps the 36px ruling rhythm */}
      <header className="title-band" style={{ height: '216px', flex: 'none' }}>
        <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => navigate('/dates')} aria-label="Back to Important dates" style={{
              width: '44px', height: '44px', borderRadius: '50%', border: 'none',
              background: '#E3D5CC', color: 'var(--ink)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '26px', lineHeight: 1.12, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Add a date worth celebrating.
            </h1>
            <QEmoji name="calendar" size={58} style={{ height: 'auto', flex: 'none', transform: 'rotate(5deg)' }} />
          </div>
        </div>
      </header>

      <div style={{ flex: 1, width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px 34px', display: 'flex', flexDirection: 'column' }}>

        {/* Who's it for */}
        <label style={{ ...whiteCard, marginTop: '18px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>Who's it for?</span>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setPicked(false) }}
              placeholder="A QT, or type a name like Mom"
              maxLength={100}
              style={{
                border: 0, outline: 'none', background: 'transparent', padding: 0,
                fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%',
              }}
            />
          </span>
        </label>
        {results.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {results.slice(0, 4).map((r) => (
              <button key={r.id} onClick={() => { setName(r.displayName); setPicked(true); setResults([]) }} style={{
                fontSize: '13px', padding: '7px 14px', borderRadius: '999px', cursor: 'pointer',
                border: '1.5px solid var(--stone)', background: 'var(--card)', color: 'var(--ink)',
                fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: 0, fontWeight: 400,
              }}>
                {r.displayName} <span style={{ color: 'var(--ink-mid)' }}>@{r.username}</span>
              </button>
            ))}
          </div>
        )}

        {/* Type */}
        <h2 style={sectionLabel}>What are we celebrating?</h2>
        <div role="radiogroup" aria-label="Kind of date" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {TYPES.map((t) => {
            const selected = type === t.key
            return (
              <button
                key={t.key}
                role="radio"
                aria-checked={selected}
                onClick={() => setType(t.key)}
                style={{
                  flex: 'none', minHeight: '44px', padding: '0 14px', borderRadius: '22px',
                  border: selected ? '2px dashed var(--stone)' : '1.5px solid var(--stone)',
                  background: selected ? 'var(--selected-fill)' : 'var(--card)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--ink)',
                  cursor: 'pointer', textTransform: 'none', letterSpacing: 0,
                }}
              >
                <QEmoji name={t.emoji} size={24} style={{ height: 'auto' }} />
                <span>{t.chip}</span>
              </button>
            )
          })}
        </div>
        {TYPES.find((t) => t.key === type)?.askOccasion && (
          <label style={{ ...whiteCard, marginTop: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>What's the occasion?{type !== 'Other' ? ' (optional)' : ''}</span>
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Pet gotcha day, big exam, moving day…"
              maxLength={50}
              style={{
                border: 0, outline: 'none', background: 'transparent', padding: 0,
                fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--ink)', width: '100%',
              }}
            />
          </label>
        )}

        {/* When — month + day scroll wheels */}
        <h2 style={sectionLabel}>When?</h2>
        <div role="group" aria-label="Date" style={{ ...whiteCard, position: 'relative', padding: '6px 10px', display: 'flex', gap: '4px' }}>
          <span aria-hidden style={{
            position: 'absolute', left: '8px', right: '8px', top: `${6 + ROW * 2}px`, height: `${ROW}px`,
            borderRadius: '12px', background: 'var(--selected-fill)', border: '1.5px solid var(--stone)',
            boxSizing: 'border-box',
          }} />
          <Wheel label="Month" flex={1.6} items={MONTHS} index={monthIndex} onChange={setMonthIndex} />
          <Wheel label="Day" flex={1} items={Array.from({ length: dayCount }, (_, i) => String(i + 1))} index={Math.min(dayIndex, dayCount - 1)} onChange={setDayIndex} />
        </div>

        {/* Every year */}
        <div style={{ ...whiteCard, marginTop: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>Every year</span>
            <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>We'll buzz you 7 days before.</span>
          </span>
          <button
            role="switch"
            aria-checked={everyYear}
            aria-label="Every year"
            onClick={() => setEveryYear(!everyYear)}
            style={{
              width: '52px', height: '32px', flex: 'none', borderRadius: '16px',
              border: '1.5px solid var(--stone)', background: everyYear ? 'var(--lime)' : '#D9CFC2',
              position: 'relative', padding: 0, cursor: 'pointer',
            }}
          >
            <span style={{
              position: 'absolute', top: '2px', left: everyYear ? '22px' : '2px',
              width: '25px', height: '25px', borderRadius: '50%', background: 'var(--card)',
              border: '1.5px solid var(--stone)', boxSizing: 'border-box', transition: 'left 0.15s ease',
            }} />
          </button>
        </div>

        {formError && (
          <p style={{ margin: '14px 0 0', fontSize: '13px', color: 'var(--error)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
            {formError}
          </p>
        )}

        <div aria-hidden style={{ flex: 1, minHeight: '24px' }} />
        <button onClick={handleSave} disabled={saving} style={{
          height: '56px', flex: 'none', borderRadius: '28px', border: '2px solid var(--stone)',
          background: 'var(--btn)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '15px',
          fontWeight: 700, letterSpacing: '0.08em', cursor: saving ? 'default' : 'pointer',
          boxSizing: 'border-box', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'SAVING…' : 'SAVE DATE'}
        </button>
      </div>
    </div>
  )
}
