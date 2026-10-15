import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// The five-tab bar from the Oct 15 redesign: ruled paper behind it, no top
// divider, grayscale inactive tabs, and the tilted SEND postage stamp.

const UV = '#5A32D6'
const INACTIVE = '#7A7389'

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
        color: active ? UV : INACTIVE, background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)',
        textTransform: 'none', letterSpacing: 0, padding: 0,
      }}>
        <img src={t.emojiIcon} alt="" style={{
          height: '34px', width: 'auto',
          filter: active ? 'none' : 'grayscale(1) opacity(0.55)',
        }} />
        {t.label}
      </button>
    )
  }

  return (
    <nav aria-label="Tabs" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      height: 'calc(88px + env(safe-area-inset-bottom))',
      padding: '12px 6px env(safe-area-inset-bottom)',
      backgroundColor: 'var(--cream)',
      backgroundImage: 'repeating-linear-gradient(transparent, transparent 35px, var(--cream-ruled) 35px, var(--cream-ruled) 36px)',
      backgroundPosition: '0 -16px',
      display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', alignItems: 'start',
    }}>
      {tab(tabs[0])}
      {tab(tabs[1])}
      <button onClick={() => navigate('/send')} aria-label="Send a card" style={{
        justifySelf: 'center', marginTop: '-34px', padding: '5px',
        width: '72px', height: '81px', boxSizing: 'border-box',
        background: 'var(--stamp-frame)', border: `3.5px dashed ${UV}`, borderRadius: '10px',
        boxShadow: '0 10px 24px rgba(90,50,214,0.28)', transform: 'rotate(-7deg)',
        display: 'flex', cursor: 'pointer',
      }}>
        <span style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '5px', background: UV, borderRadius: '6px',
        }}>
          <svg aria-hidden width="38" height="26" viewBox="0 0 44 30">
            <path d="M14 27C6 21 2 16 2 10.5 2 6 5.5 3 9.5 3c2.4 0 4 1.2 4.5 2.6C14.5 4.2 16.1 3 18.5 3 22.5 3 26 6 26 10.5 26 16 22 21 14 27z" fill="#C6FF3D" />
            <path d="M23 9c3-2 5-2 8 0s5 2 8 0M23 15c3-2 5-2 8 0s5 2 8 0M23 21c3-2 5-2 8 0s5 2 8 0" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.2em', paddingLeft: '0.2em', color: '#fff' }}>SEND</span>
        </span>
      </button>
      {tab(tabs[2])}
      {tab(tabs[3])}
    </nav>
  )
}
