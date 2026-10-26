import { useEffect, useRef, useState } from 'react'
import { trackFunnel } from '../../lib/analytics'
import { clearSetupNext } from '../../lib/postAuthRoute'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import QEmoji from '../../components/QEmoji'
import TwinklingCake from '../../components/TwinklingCake'
import QIcon from '../../components/QIcon'

// Sign-up: birthday — screen 05 of the Oct 15 2026 redesign. Month, day and
// year on a scroll wheel (plain scroll-snap columns, no external deps).
// Birthday is OPTIONAL: SAVE MY BIRTHDAY saves via PUT /users/me, and
// "Skip for now" goes straight home.

const ROW = 36 // one notebook-ruling line per wheel row

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 24px', boxSizing: 'border-box',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 101 }, (_, i) => THIS_YEAR - 100 + i) // oldest → newest
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

// One scroll-snap column of the wheel. The chosen row is whichever row sits
// under the highlight band at the center; styling fades rows by distance.
function WheelColumn({ items, index, onChange, flex }: {
  items: (string | number)[]
  index: number
  onChange: (i: number) => void
  flex: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Start scrolled to the initial selection
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = index * ROW
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)))
    if (i !== index) onChange(i)
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="qn-wheel"
      style={{
        flex, height: `${ROW * 5}px`, overflowY: 'auto', scrollSnapType: 'y mandatory',
        position: 'relative', zIndex: 1, scrollbarWidth: 'none', msOverflowStyle: 'none' as any,
      }}
    >
      <div style={{ height: `${ROW * 2}px` }} />
      {items.map((it, i) => {
        const d = Math.abs(i - index)
        return (
          <div key={String(it)} style={{
            height: `${ROW}px`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            scrollSnapAlign: 'center',
            fontSize: d === 0 ? '20px' : d === 1 ? '17px' : '15px',
            fontWeight: d === 0 ? 700 : 400,
            opacity: d === 0 ? 1 : d === 1 ? 0.45 : 0.2,
          }}>
            {it}
          </div>
        )
      })}
      <div style={{ height: `${ROW * 2}px` }} />
    </div>
  )
}

export default function SignupBirthdayPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [monthIdx, setMonthIdx] = useState(0) // January
  const [dayIdx, setDayIdx] = useState(0) // 1
  const [yearIdx, setYearIdx] = useState(YEARS.indexOf(2000))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    setSaving(true)
    const mm = String(monthIdx + 1).padStart(2, '0')
    const dd = String(DAYS[dayIdx]).padStart(2, '0')
    try {
      await api.put('/users/me', { birthday: `${YEARS[yearIdx]}-${mm}-${dd}` })
      refreshUser()
      trackFunnel('setup', 'setup-complete')
      clearSetupNext()
      navigate('/home')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong. Try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
      <style>{`.qn-wheel::-webkit-scrollbar{display:none}`}</style>

      {/* Title band — 324px, still a multiple of 36 so the ruling keeps its
          rhythm; it grew to hold the big cake (Emerald, Oct 24). */}
      <header className="title-band" style={{
        height: '324px', boxSizing: 'border-box', flex: 'none',
        paddingTop: 'max(calc(54px - env(safe-area-inset-top)), 0px)',
      }}>
        <div style={col}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => navigate(-1)} aria-label="Back" style={{
              width: '44px', height: '44px', borderRadius: '50%', background: 'var(--light-blush)',
              border: 'none', cursor: 'pointer', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <QIcon name="chevron-left" size={18} />
            </button>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{
              margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 300,
              fontSize: '26px', lineHeight: '36px', letterSpacing: '-0.02em',
            }}>
              When can we celebrate you?
            </h1>
            <TwinklingCake size={192} style={{ transform: 'rotate(-6deg)' }} />
          </div>
        </div>
      </header>

      <div style={{ ...col, flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '40px' }}>
        <p style={{ margin: '18px 0 0', fontSize: '15px', lineHeight: '18px', color: 'var(--ink)' }}>
          Some birthday wishes deserve to be held.
        </p>

        <div role="group" aria-label="Birthday" style={{
          marginTop: '20px', position: 'relative', background: 'var(--card)',
          border: '1.5px solid var(--outline)', borderRadius: '18px', padding: '8px 10px', display: 'flex', gap: '4px',
        }}>
          {/* The highlight band behind the chosen row */}
          <span aria-hidden style={{
            position: 'absolute', left: '8px', right: '8px', top: `${8 + ROW * 2}px`, height: `${ROW}px`,
            borderRadius: '12px', background: 'var(--selected-fill)', border: '1.5px solid var(--outline)', boxSizing: 'border-box',
          }} />
          <WheelColumn items={MONTHS} index={monthIdx} onChange={setMonthIdx} flex={1.6} />
          <WheelColumn items={DAYS} index={dayIdx} onChange={setDayIdx} flex={0.8} />
          <WheelColumn items={YEARS} index={yearIdx} onChange={setYearIdx} flex={1} />
        </div>

        <div className="qn-stamp" style={{
          marginTop: '14px', background: 'transparent', border: '10px solid transparent',
          borderRadius: '16px', padding: '14px 6px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <QEmoji name="mailbox" size={46} style={{ flex: 'none' }} />
          {/* the two sentences each get their own line, so the second "A"
              never dangles at the end of the first (Emerald, Oct 25) */}
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '18px', whiteSpace: 'pre-line' }}>
            {'A little reminder for your QTs.\nA little magic for your mailbox.'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--error-pale)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '10px', padding: '12px 16px', marginTop: '14px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              height: '56px', borderRadius: '28px', border: '2px solid #B4897A', boxSizing: 'border-box',
              cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? 'var(--light-blush)' : 'var(--btn)', color: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em',
            }}
          >
            {saving ? 'SAVING…' : 'SAVE MY BIRTHDAY'}
          </button>
          <button
            onClick={() => { clearSetupNext(); navigate('/home') }}
            style={{
              minHeight: '44px', border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink)',
              fontWeight: 400, textTransform: 'none', letterSpacing: 0,
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
