import QEmoji from './QEmoji'

// Her birthday cake with the candles actually lit (her twinkling-cake package,
// Oct 24; Emerald: "put the twinkle everywhere"). The flame and glow layers sit
// on the candles by percentage and size themselves off the cake's width, so one
// component works at 32px in a row chip and at 112px on a card. Reduce Motion
// stills the flames (see .qn-flame in index.css).
const SPOTS = [
  { left: '30.8%', flameTop: '13.4%', glowTop: '11%', delay: '-0.2s', dur: '0.85s', glowDelay: '-0.3s' },
  { left: '50%', flameTop: '12.8%', glowTop: '10.5%', delay: '-0.55s', dur: '1s', glowDelay: '-1.1s' },
  { left: '67.6%', flameTop: '12.1%', glowTop: '10%', delay: '-0.35s', dur: '0.92s', glowDelay: '-0.7s' },
]

export default function TwinklingCake({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <div className="qn-cake" role="img" aria-label="Birthday cake with three lit candles"
      style={{ width: `${size}px`, flex: 'none', ...style }}>
      <QEmoji name="cake" size={size} style={{ width: '100%', height: 'auto' }} />
      {SPOTS.map((s, i) => (
        <span key={`g${i}`} className="qn-glow" style={{ left: s.left, top: s.glowTop, animationDelay: s.glowDelay }} />
      ))}
      {SPOTS.map((s, i) => (
        <span key={`f${i}`} className="qn-flame" style={{ left: s.left, top: s.flameTop, animationDelay: s.delay, animationDuration: s.dur }} />
      ))}
    </div>
  )
}
