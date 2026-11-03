import { useEffect, useState } from 'react'

// The opening beat (Emerald, Nov 2): the Venmo pattern — a flat wash of brand
// colour over the ghosted app — wearing HER postmark from the top of the
// website: the inky cancellation ring, the four wavy strike lines drawing
// across, and the wax seal pressing down into the middle. Once per launch.

const SHOWN_KEY = 'qn_splash_shown'
const WASH = 'var(--paper)'
const GHOST = 'rgba(180,137,122,0.14)'

export default function SplashScreen() {
  const [state, setState] = useState<'hidden' | 'in' | 'out'>(() => {
    try { return sessionStorage.getItem(SHOWN_KEY) ? 'hidden' : 'in' } catch { return 'in' }
  })

  useEffect(() => {
    if (state !== 'in') return
    try { sessionStorage.setItem(SHOWN_KEY, '1') } catch { /* private mode */ }
    const leave = setTimeout(() => setState('out'), 1250)
    const gone = setTimeout(() => setState('hidden'), 1720)
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
        position: 'fixed', inset: 0, zIndex: 200,
        background: WASH, backgroundImage: 'url(/brand/paper_texture.png)',
        padding: 'calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 18px)',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px',
        pointerEvents: 'none', overflow: 'hidden',
        opacity: state === 'out' ? 0 : 1,
        transition: 'opacity 0.45s ease',
      }}
    >
      <style>{`
        @keyframes qn-ring  { from { stroke-dashoffset: 540; } to { stroke-dashoffset: 0; } }
        @keyframes qn-dots  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes qn-strike{ from { stroke-dashoffset: 230; } to { stroke-dashoffset: 0; } }
        @keyframes qn-press { 0% { opacity: 0; transform: scale(1.5) rotate(-12deg); }
                              65% { opacity: 1; transform: scale(0.95) rotate(2deg); }
                              100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        .qn-ring   { stroke-dasharray: 540; animation: qn-ring 0.55s ease-out both; }
        .qn-dots   { animation: qn-dots 0.3s 0.45s ease-out both; }
        .qn-strike { stroke-dasharray: 230; animation: qn-strike 0.42s ease-out both; }
        .qn-s1 { animation-delay: 0.30s } .qn-s2 { animation-delay: 0.38s }
        .qn-s3 { animation-delay: 0.46s } .qn-s4 { animation-delay: 0.54s }
        .qn-wax    { animation: qn-press 0.5s 0.62s cubic-bezier(.2,.9,.3,1.35) both; transform-origin: 98px 96px; }
                @media (prefers-reduced-motion: reduce) {
          .qn-ring, .qn-dots, .qn-strike, .qn-wax { animation: none; opacity: 1; stroke-dashoffset: 0; transform: none; }
        }
      `}</style>

      {/* the ghosted bones of Home under the wash */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={block('100%', 48, 24)} />
        <span style={block('48px', 48, 24)} />
      </div>
      <span style={block('60%', 30, 8)} />
      <span style={block('100%', 74, 14)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        {/* her postmark, the same one that cancels "Send" on the website */}
        <svg viewBox="0 0 380 190" width="300" height="150" aria-hidden style={{ overflow: 'visible' }}>
          <g fill="none" stroke="#4A2424" strokeLinecap="round" opacity="0.92">
            <circle className="qn-ring" cx="98" cy="96" r="84" strokeWidth="10" />
            <circle className="qn-dots" cx="98" cy="96" r="68" strokeWidth="3" strokeDasharray="40 14 70 10" />
            <path className="qn-strike qn-s1" d="M176 64 q20 -14 40 0 t40 0 t40 0 t40 0 t40 -6" strokeWidth="10" />
            <path className="qn-strike qn-s2" d="M182 88 q20 -14 40 0 t40 0 t40 0 t40 0 t36 -4" strokeWidth="10" />
            <path className="qn-strike qn-s3" d="M182 112 q20 -14 40 0 t40 0 t40 0 t40 0 t38 -4" strokeWidth="10" />
            <path className="qn-strike qn-s4" d="M176 136 q20 -14 40 0 t40 0 t40 0 t40 0 t36 -6" strokeWidth="10" />
          </g>
          <image className="qn-wax" href="/brand/wax-press.webp" xlinkHref="/brand/wax-press.webp"
            x="43" y="46" width="110" height="100" preserveAspectRatio="xMidYMid meet" />
        </svg>

      </div>

      <span style={block('100%', 88, 18)} />
      <span style={block('100%', 88, 18)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px 0' }}>
        {[0, 1, 2, 3, 4].map((i) => <span key={i} style={block('42px', 42, 12)} />)}
      </div>
    </div>
  )
}
