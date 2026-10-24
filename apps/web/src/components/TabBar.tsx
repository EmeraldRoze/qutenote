import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// The five-tab bar, palette 4: paper grain behind it, no top divider,
// warm-tinted inactive tabs, and the perforated dusty rose SEND stamp.

const ACTIVE = '#9E625F'
const INACTIVE = 'var(--nav-inactive)'

export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()

  const tabs: { label: string; path: string; emojiIcon: string }[] = [
    { label: 'Home', path: '/home', emojiIcon: '/emoji/house.png' },
    { label: 'QTs', path: '/connections', emojiIcon: '/emoji/bff.png' },
    { label: 'Dates', path: '/dates', emojiIcon: '/emoji/calendar.png' },
    { label: 'Profile', path: `/profile/${user?.username ?? ''}`, emojiIcon: '/emoji/sunglasses.png' },
  ]

  function tab(t: typeof tabs[number]) {
    const active = pathname === t.path || (t.path.startsWith('/profile') && pathname.startsWith('/profile'))
    return (
      <button key={t.label} onClick={() => navigate(t.path)} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
        color: active ? ACTIVE : INACTIVE, background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-body)',
        textTransform: 'none', letterSpacing: 0, padding: 0,
      }}>
        <img src={t.emojiIcon} alt="" className={active ? undefined : 'tab-inactive'} style={{ height: '38px', width: 'auto' }} />
        {t.label}
      </button>
    )
  }

  return (
    <nav aria-label="Tabs" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      height: 'calc(90px + env(safe-area-inset-bottom))',
      padding: '14px 6px env(safe-area-inset-bottom)',
      backgroundColor: 'var(--paper)',
      backgroundImage: 'url(/brand/paper_texture.png)',
      display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', alignItems: 'start',
    }}>
      {tab(tabs[0])}
      {tab(tabs[1])}
      {/* The real photorealistic stamp edge now (Emerald, Oct 24): textured
          cardstock, punched perforations and the light blue printed panel are
          all drawn by .qn-stamp, so the button itself stays transparent. */}
      <button onClick={() => navigate('/send')} aria-label="Send a card" className="qn-stamp qn-stamp-tight" style={{
        justifySelf: 'center', marginTop: '-36px', padding: 0,
        width: '84px', height: '94px', boxSizing: 'border-box',
        border: 'none', transform: 'rotate(-7deg)',
        // the stamp's own edge shading (same as every other qn-stamp, which an
        // inline filter would otherwise wipe out) plus the lift off the bar —
        // Emerald, Oct 24: enough contrast that the edge reads against paper
        filter: 'drop-shadow(0 0 1.5px rgba(74, 36, 36, 0.5)) drop-shadow(0 0 4px rgba(74, 36, 36, 0.28)) drop-shadow(0 0 10px rgba(74, 36, 36, 0.14)) drop-shadow(0 8px 12px rgba(158, 98, 95, 0.3))',
        ['--qn-panel' as string]: 'var(--btn)',
        display: 'flex', cursor: 'pointer',
      }}>
        <span style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
          color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700,
          fontSize: '13px', letterSpacing: '0.2em', paddingLeft: '0.2em',
        }}>
          <svg aria-hidden width="44" height="30" viewBox="0 0 44 30">
            <image href="/brand/send_stamp_heart.png" x="-1" y="2.5" width="29" height="25.6" />
            <path d="M23 9c3-2 5-2 8 0s5 2 8 0M23 15c3-2 5-2 8 0s5 2 8 0M23 21c3-2 5-2 8 0s5 2 8 0" fill="none" stroke="#4A2424" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          SEND
        </span>
      </button>
      {tab(tabs[2])}
      {tab(tabs[3])}
    </nav>
  )
}
