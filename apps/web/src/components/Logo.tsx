// The QuteNote wordmark: her heart for the Q, the letters set in Unbounded
// Light, her postmark waves after it (Emerald, Oct 25).
//
// The whole lockup is masked with a fine ink grain so it reads as one rubber
// stamp pressed onto the paper rather than clean printed type — heart,
// letters and waves all break up together.
export default function Logo({ height = 26, color = 'var(--ink)', style }: {
  height?: number
  color?: string
  style?: React.CSSProperties
}) {
  const inked: React.CSSProperties = {
    WebkitMaskImage: "url('/brand/ink_grain.png')",
    maskImage: "url('/brand/ink_grain.png')",
    WebkitMaskSize: `${height * 4}px`,
    maskSize: `${height * 4}px`,
    WebkitMaskRepeat: 'repeat',
    maskRepeat: 'repeat',
  }
  return (
    <span
      role="img"
      aria-label="QuteNote"
      style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1, color, ...inked, ...style }}
    >
      {/* her heart, whole — its tail sweeps right and down under the letters,
          so the type starts slightly on top of it instead of after it */}
      <img
        src="/brand/logo-heart.png"
        alt=""
        style={{ height: `${height * 1.3}px`, width: 'auto', display: 'block', marginRight: `${height * -0.1}px` }}
      />
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 300,
        fontSize: `${height}px`, letterSpacing: '-0.02em', color,
      }}>
        uteNote
      </span>
      {/* the waves sit low and to the right, the way a postmark lands */}
      <img
        src="/brand/logo-waves.png"
        alt=""
        style={{
          height: `${height * 0.58}px`, width: 'auto', display: 'block',
          marginLeft: `${height * 0.38}px`, transform: `translateY(${height * 0.3}px)`,
        }}
      />
    </span>
  )
}
