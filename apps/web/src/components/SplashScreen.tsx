import { useEffect, useState } from 'react'

// The opening beat (Emerald, Nov 3): on her lined paper, the whole postmark
// lands at once in oxblood, then the neon swatch appears inside the ring,
// then the wax heart stamps down onto it. Once per app launch.

const SHOWN_KEY = 'qn_splash_shown'

export default function SplashScreen() {
  const [state, setState] = useState<'hidden' | 'in' | 'out'>(() => {
    try { return sessionStorage.getItem(SHOWN_KEY) ? 'hidden' : 'in' } catch { return 'in' }
  })

  useEffect(() => {
    if (state !== 'in') return
    try { sessionStorage.setItem(SHOWN_KEY, '1') } catch { /* private mode */ }
    const leave = setTimeout(() => setState('out'), 1750)
    const gone = setTimeout(() => setState('hidden'), 2250)
    return () => { clearTimeout(leave); clearTimeout(gone) }
  }, [state])

  if (state === 'hidden') return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'var(--paper)',
        backgroundImage:
          'repeating-linear-gradient(transparent, transparent 35px, var(--cream-ruled) 35px, var(--cream-ruled) 36px), url(/brand/paper_texture.png)',
        backgroundPosition: '0 env(safe-area-inset-top), 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        opacity: state === 'out' ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      <style>{`
        /* 1 — the whole postmark lands */
        @keyframes qn-mark  { 0% { opacity: 0; transform: scale(1.12) rotate(-6deg); }
                              70% { opacity: 1; transform: scale(0.99) rotate(1deg); }
                              100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        /* 2 — the neon swatch appears inside the ring */
        @keyframes qn-swatch{ 0% { opacity: 0; transform: scale(0.2); }
                              70% { opacity: 1; transform: scale(1.08); }
                              100% { opacity: 1; transform: scale(1); } }
        /* 3 — the heart stamps down onto it */
        @keyframes qn-stamp { 0% { opacity: 0; transform: scale(2) rotate(-16deg); }
                              55% { opacity: 1; transform: scale(0.9) rotate(3deg); }
                              75% { transform: scale(1.04) rotate(-1deg); }
                              100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        .qn-mark   { animation: qn-mark 0.42s cubic-bezier(.2,.9,.3,1.2) both; transform-origin: 98px 96px; }
        .qn-swatch { animation: qn-swatch 0.34s 0.5s cubic-bezier(.2,.9,.3,1.4) both; transform-origin: 98px 96px; }
        .qn-heart  { animation: qn-stamp 0.46s 0.86s cubic-bezier(.25,.9,.3,1.5) both; transform-origin: 98px 96px; }
        @media (prefers-reduced-motion: reduce) {
          .qn-mark, .qn-swatch, .qn-heart { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      <svg viewBox="0 0 380 190" width="320" height="160" aria-hidden style={{ overflow: 'visible' }}>
        {/* the postmark: ring, dashed inner ring, four strike lines */}
        <g className="qn-mark" fill="none" stroke="#4A2424" strokeLinecap="round">
          <circle cx="98" cy="96" r="84" strokeWidth="10" />
          <circle cx="98" cy="96" r="68" strokeWidth="3" strokeDasharray="40 14 70 10" />
          <path d="M176 64 q20 -14 40 0 t40 0 t40 0 t40 0 t40 -6" strokeWidth="10" />
          <path d="M182 88 q20 -14 40 0 t40 0 t40 0 t40 0 t36 -4" strokeWidth="10" />
          <path d="M182 112 q20 -14 40 0 t40 0 t40 0 t40 0 t38 -4" strokeWidth="10" />
          <path d="M176 136 q20 -14 40 0 t40 0 t40 0 t40 0 t36 -6" strokeWidth="10" />
        </g>

        {/* the neon swatch inside the ring */}
        <circle className="qn-swatch" cx="98" cy="96" r="52" fill="#EEFC4E" />

        {/* and the heart stamped onto it */}
        <image className="qn-heart" href="/brand/wax_heart.png" xlinkHref="/brand/wax_heart.png"
          x="47" y="48" width="102" height="92" preserveAspectRatio="xMidYMid meet" />
      </svg>
    </div>
  )
}
