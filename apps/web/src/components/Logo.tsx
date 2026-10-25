// The QuteNote wordmark, set in Unbounded Light (Emerald, Oct 25 — the old
// logo art was a rounded bold face; the brand font is Unbounded 300).
// Her heart stands in for the Q and her postmark waves close the lockup;
// only the letters are type.
export default function Logo({ height = 26, color = 'var(--ink)', style }: {
  height?: number
  color?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      role="img"
      aria-label="QuteNote"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: `${height * 0.1}px`,
        lineHeight: 1, color, ...style,
      }}
    >
      <img src="/brand/logo-heart.png" alt="" style={{ height: `${height * 1.18}px`, width: 'auto', display: 'block' }} />
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 300,
        fontSize: `${height}px`, letterSpacing: '-0.02em', color,
        transform: `translateY(${height * 0.02}px)`,
      }}>
        uteNote
      </span>
      <img src="/brand/logo-waves.png" alt="" style={{ height: `${height * 0.62}px`, width: 'auto', display: 'block', marginLeft: `${height * 0.22}px` }} />
    </span>
  )
}
