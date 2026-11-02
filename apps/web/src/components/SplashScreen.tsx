import { useEffect, useState } from 'react'

// The opening beat (Emerald, Nov 2, copying Venmo): the app's own shapes are
// there but ghosted under a flat wash of brand colour, with the mark in the
// middle, and then it lifts and the real screen is underneath. Once per app
// launch, never between screens.

const SHOWN_KEY = 'qn_splash_shown'
const WASH = '#BADAFF'          // baby blue, the same panel colour as the SEND stamp
const GHOST = 'rgba(255,255,255,0.22)'

export default function SplashScreen() {
  const [state, setState] = useState<'hidden' | 'in' | 'out'>(() => {
    try { return sessionStorage.getItem(SHOWN_KEY) ? 'hidden' : 'in' } catch { return 'in' }
  })

  useEffect(() => {
    if (state !== 'in') return
    try { sessionStorage.setItem(SHOWN_KEY, '1') } catch { /* private mode */ }
    const leave = setTimeout(() => setState('out'), 1450)
    const gone = setTimeout(() => setState('hidden'), 1950)
    return () => { clearTimeout(leave); clearTimeout(gone) }
  }, [state])

  if (state === 'hidden') return null

  const block = (w: string, h: number, r = 10): React.CSSProperties => ({
    width: w, height: `${h}px`, borderRadius: `${r}px`, background: GHOST, flex: 'none',
  })

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: WASH,
        padding: 'calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 18px)',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px',
        pointerEvents: 'none', overflow: 'hidden',
        opacity: state === 'out' ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      <style>{`
        @keyframes qn-splash-press {
          0%   { transform: rotate(-14deg) scale(1.3); opacity: 0; }
          55%  { transform: rotate(-5deg)  scale(0.97); opacity: 1; }
          100% { transform: rotate(-7deg)  scale(1); opacity: 1; }
        }
        @keyframes qn-splash-heart {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes qn-splash-ink { from { stroke-dashoffset: 46; } to { stroke-dashoffset: 0; } }
        @keyframes qn-splash-line { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .qn-splash-stamp { animation: qn-splash-press 0.6s cubic-bezier(.2,.9,.3,1.2) both; }
        .qn-splash-heart { animation: qn-splash-heart 0.48s 0.3s cubic-bezier(.2,.9,.3,1.3) both; }
        .qn-splash-ink   { stroke-dasharray: 46; animation: qn-splash-ink 0.4s 0.48s ease-out both; }
        .qn-splash-words { animation: qn-splash-line 0.45s 0.62s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .qn-splash-stamp, .qn-splash-heart, .qn-splash-ink, .qn-splash-words { animation: none; opacity: 1; }
          .qn-splash-stamp { transform: rotate(-7deg); }
          .qn-splash-ink { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* the ghosted bones of Home, so the wash feels like the app underneath */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={block('100%', 48, 24)} />
        <span style={block('48px', 48, 24)} />
      </div>
      <span style={block('60%', 30, 8)} />
      <span style={block('100%', 74, 14)} />

      {/* the mark, pressed into the middle of it */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '22px' }}>
        <span
          className="qn-stamp qn-stamp-tight qn-splash-stamp"
          style={{
            width: '162px', height: '182px', boxSizing: 'border-box', border: 'none', padding: 0,
            ['--qn-panel' as string]: '#D9EAFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <svg width="100" height="62" viewBox="0 0 44 30" aria-hidden>
              <g className="qn-splash-heart" style={{ transformOrigin: '14px 15px' }}>
                <image href="/brand/send_stamp_heart.png" x="-1" y="2.5" width="29" height="25.6" />
              </g>
              <path
                className="qn-splash-ink"
                d="M23 9c3-2 5-2 8 0s5 2 8 0M23 15c3-2 5-2 8 0s5 2 8 0M23 21c3-2 5-2 8 0s5 2 8 0"
                fill="none" stroke="#4A2424" strokeWidth="1.8" strokeLinecap="round"
              />
            </svg>
            <span style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '15px',
              letterSpacing: '0.22em', paddingLeft: '0.22em', color: 'var(--ink)',
            }}>SEND</span>
          </span>
        </span>

        <span className="qn-splash-words" style={{
          fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '25px',
          letterSpacing: '-0.01em', color: 'var(--ink)', textAlign: 'center',
        }}>Send something real.</span>
      </div>

      {/* ghosted feed + tab bar */}
      <span style={block('100%', 88, 18)} />
      <span style={block('100%', 88, 18)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px 0' }}>
        {[0, 1, 2, 3, 4].map((i) => <span key={i} style={block('42px', 42, 12)} />)}
      </div>
    </div>
  )
}
