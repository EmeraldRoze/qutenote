import { useNavigate } from 'react-router-dom'

// Welcome — screen 01 of the Oct 15 2026 redesign. The app's front door:
// logo in the title band, headline + floating postmark stamp mid-screen on
// the ruled lines, LOG IN and SIGN UP pinned at the bottom.

const uv = '#5A32D6'

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 24px', boxSizing: 'border-box',
}

export default function WelcomePage() {
  const navigate = useNavigate()
  return (
    <div style={{
      height: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-body)', color: 'var(--ink)',
    }}>
      {/* Title band — 144px, a multiple of 36 so the ruling keeps its rhythm */}
      <header className="title-band" style={{
        height: '144px', boxSizing: 'border-box', flex: 'none',
        paddingTop: 'max(calc(54px - env(safe-area-inset-top)), 0px)',
      }}>
        <div style={{ ...col, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/brand/qutenote_logo.png" alt="QuteNote" style={{ height: '32px', width: 'auto' }} />
        </div>
      </header>

      <div style={{ ...col, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '50px',
          lineHeight: 1.04, letterSpacing: '-0.03em', color: 'var(--ink)',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <span style={{ position: 'relative' }}>
            <span>Send</span>
            <img src="/brand/postmark_heart_stamp.png" alt="" style={{
              position: 'absolute', left: '160px', top: '-52px', width: '196px', height: 'auto', transform: 'rotate(-6deg)',
            }} />
          </span>
          <span>something</span>
          <span>real.</span>
        </h1>
        <p style={{ margin: '22px 0 0', fontSize: '17px', lineHeight: 1.5, color: 'var(--ink-mid)', maxWidth: '300px' }}>
          Because sometimes a text isn't enough.
        </p>
      </div>

      <div style={{
        ...col, marginTop: 'auto', paddingBottom: '40px', flex: 'none',
        display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px',
      }}>
        <button onClick={() => navigate('/login')} style={{
          height: '56px', borderRadius: '28px', border: '2px solid var(--ink)', background: '#FFFFFF',
          color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em',
        }}>
          LOG IN
        </button>
        <button onClick={() => navigate('/signup')} style={{
          height: '56px', borderRadius: '28px', border: 'none', background: uv,
          color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em',
        }}>
          SIGN UP
        </button>
      </div>
    </div>
  )
}
