import { useEffect, useState } from 'react'

// The opening beat (Emerald, Nov 18). Everything is on the screen the instant
// the app opens: her real inky postmark, with the lime wax blob already
// sitting in the ring. Nothing flies in, nothing scales up. The ONLY thing
// that happens is the heart being pressed into the wax.
//
// The press is her own artwork, frame for frame. /brand/wax_press.png is a
// 12-frame animated PNG of the wax being stamped, and her frame timings are
// the direction: frame 1 holds 700ms (the blob waiting), frames 2-9 run at
// 110ms (the press), frame 10 holds 2s (stamped). Frames 11-12 only exist to
// ease it back to a blob so the loop can repeat, which is exactly what a
// splash must NOT do — so the strip below is frames 1-10 and it stops on 10.
//
// Why a sprite strip rather than the animated PNG itself: an APNG plays and
// loops on its own terms with no way to stop it on a chosen frame. Laid out
// as a strip, the keyframes below reproduce her timings exactly and hold.
const FRAMES = 10
const PRESS_MS = 1580 // 700 + 8x110, i.e. her timings up to the stamped frame

// Her composition, measured from her own finished postmark_heart_stamp.png so
// the wax lands where she put it rather than where I guessed: centre at
// 25.4% / 53.7% of the art, 31.8% of its width.
const WAX = { left: 25.43, top: 53.66, width: 31.84 }

const SHOWN_KEY = 'qn_splash_shown'

export default function SplashScreen() {
  const [state, setState] = useState<'hidden' | 'in' | 'out'>(() => {
    try { return sessionStorage.getItem(SHOWN_KEY) ? 'hidden' : 'in' } catch { return 'in' }
  })

  useEffect(() => {
    if (state !== 'in') return
    try { sessionStorage.setItem(SHOWN_KEY, '1') } catch { /* private mode */ }
    // Let the stamped heart sit for a beat before we leave, the way her
    // own 2-second hold on frame 10 intends.
    const leave = setTimeout(() => setState('out'), PRESS_MS + 620)
    const gone = setTimeout(() => setState('hidden'), PRESS_MS + 1120)
    return () => { clearTimeout(leave); clearTimeout(gone) }
  }, [state])

  if (state === 'hidden') return null

  // Each frame's start time as a percentage of the whole press, straight from
  // her durations, so the rhythm on screen is the rhythm she drew.
  const starts = [0, 700, 810, 920, 1030, 1140, 1250, 1360, 1470, 1580]
  const keyframes = starts
    .map((ms, i) => `${((ms / PRESS_MS) * 100).toFixed(3)}% { background-position-x: ${((i / (FRAMES - 1)) * 100).toFixed(3)}%; }`)
    .join('\n        ')

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
        @keyframes qn-press {
        ${keyframes}
        }
        .qn-press {
          animation: qn-press ${PRESS_MS}ms step-end forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          /* no press — just show it already stamped */
          .qn-press { animation: none; background-position-x: 100%; }
        }
      `}</style>

      <div style={{ position: 'relative', width: 'min(86vw, 360px)' }}>
        {/* her postmark, exactly as she drew it */}
        <img
          src="/brand/postmark_stamp_heartless.png"
          alt=""
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
        {/* the wax, already in the ring, waiting to be stamped */}
        <div
          className="qn-press"
          style={{
            position: 'absolute',
            left: `${WAX.left}%`,
            top: `${WAX.top}%`,
            width: `${WAX.width}%`,
            aspectRatio: '224 / 204',
            transform: 'translate(-50%, -50%)',
            backgroundImage: 'url(/brand/wax_press_strip.png)',
            backgroundSize: `${FRAMES * 100}% 100%`,
            backgroundRepeat: 'no-repeat',
            backgroundPositionX: '0%',
          }}
        />
      </div>
    </div>
  )
}
