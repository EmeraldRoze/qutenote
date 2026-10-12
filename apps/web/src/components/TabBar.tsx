import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const UV = '#5A32D6'
const INACTIVE = '#766E82'

export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()

  const tabs: { label: string; path: string; emojiIcon: string }[] = [
    { label: 'Home', path: '/home', emojiIcon: '/emoji/house.png' },
    { label: 'QTs', path: '/connections', emojiIcon: '/emoji/bff.png' },
    { label: 'Dates', path: '/dates', emojiIcon: '/emoji/calendar.png' },
    { label: 'Profile', path: `/profile/${user?.username ?? ''}`, emojiIcon: '/emoji/smile.png' },
  ]

  function tab(t: typeof tabs[number]) {
    const active = pathname === t.path || (t.path.startsWith('/profile') && pathname.startsWith('/profile'))
    return (
      <button key={t.label} onClick={() => navigate(t.path)} style={{
        width: '56px', height: '46px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '3px',
        color: active ? UV : INACTIVE, background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-body)',
        textTransform: 'none', letterSpacing: 0,
      }}>
        <img src={t.emojiIcon} alt="" style={{
          height: '22px', width: 'auto',
          filter: active ? 'none' : 'grayscale(1) opacity(0.55)',
        }} />
        {t.label}
      </button>
    )
  }

  return (
    <nav aria-label="Tabs" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      height: 'calc(64px + env(safe-area-inset-bottom))',
      padding: '8px 10px env(safe-area-inset-bottom)',
      background: 'var(--cream)', borderTop: '1px solid var(--stone)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start',
    }}>
      {tab(tabs[0])}
      {tab(tabs[1])}
      <button onClick={() => navigate('/send')} aria-label="Send a postcard" style={{
        width: '58px', height: '66px', marginTop: '-26px', padding: '4px',
        background: 'var(--lavender-pale)', border: `2.5px dashed ${UV}`, borderRadius: '6px',
        boxShadow: '0 6px 16px rgba(90,50,214,0.25)', transform: 'rotate(-4deg)',
        display: 'flex', cursor: 'pointer',
      }}>
        <span style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '4px', background: UV, borderRadius: '3px',
        }}>
          <span style={{ position: 'relative', width: '30px', height: '20px' }}>
            <img src="/brand/postmark-heart-only.png" alt="" style={{ position: 'absolute', inset: 0, width: '30px', height: '20px', objectFit: 'contain' }} />
            <img src="/brand/postmark-waves-white.png" alt="" style={{ position: 'absolute', inset: 0, width: '30px', height: '20px', objectFit: 'contain' }} />
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '9px', letterSpacing: '0.14em', color: '#fff' }}>SEND</span>
        </span>
      </button>
      {tab(tabs[2])}
      {tab(tabs[3])}
    </nav>
  )
}
