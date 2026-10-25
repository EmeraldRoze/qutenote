import { useNavigate } from 'react-router-dom'
import { WEB_BUILD } from '../lib/buildGuard'
import { WAX_CENTER_X, WAX_CENTER_Y, WAX_WIDTH } from '../lib/wax'

// Welcome — screen 01 of the Oct 15 2026 redesign. The app's front door:
// logo in the title band, headline + floating postmark stamp mid-screen on
// the ruled lines, LOG IN and SIGN UP pinned at the bottom.

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
          margin: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '50px',
          lineHeight: 1.04, letterSpacing: '-0.03em', color: 'var(--ink)',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <span style={{ position: 'relative' }}>
            <span>Send</span>
            {/* the postmark, with the wax heart being pressed live (Emerald, Oct 23) */}
            <span style={{ position: 'absolute', left: '160px', top: '-52px', width: '196px', transform: 'rotate(-6deg)', display: 'block' }}>
              <img src="/brand/postmark_stamp_heartless.png" alt="" style={{ width: '196px', height: 'auto', display: 'block' }} />
              <img src="/brand/wax_press.png" alt="" style={{
                position: 'absolute', left: `${196 * WAX_CENTER_X}px`, top: `${196 * WAX_CENTER_Y}px`,
                width: `${Math.round(196 * WAX_WIDTH * 1.12)}px`, transform: 'translate(-50%, -50%)',
              }} />
            </span>
          </span>
          <span>something</span>
          <span>real.</span>
        </h1>
        <p style={{ margin: '22px 0 0', fontSize: '17px', lineHeight: 1.5, color: 'var(--ink)', maxWidth: '300px' }}>
          Because sometimes a text isn't enough.
        </p>
      </div>

      <div className="qn-actions-row" style={{ ...col, marginTop: 'auto', paddingBottom: '40px', flex: 'none' }}>
        <button onClick={() => navigate('/login')} className="qn-stamp qn-action">
          LOG IN
        </button>
        <button onClick={() => navigate('/signup')} className="qn-stamp qn-action"
          style={{ ['--qn-panel' as string]: 'var(--btn)' }}>
          SIGN UP
        </button>
      </div>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--ink-muted)', margin: '10px 0 4px' }}>
        build {WEB_BUILD || 'dev'}
      </p>
    </div>
  )
}
