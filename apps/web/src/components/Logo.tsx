// The QuteNote wordmark — her hand-drawn one (Emerald, Oct 26): the heart
// crossed like a Q, UTENOTE in her brush lettering, and the postmark waves,
// all one piece of art. Cut from her drawing by lifting the ink as alpha, so
// every rough edge and dry-brush speckle survives, then inked in oxblood.
//
// Earlier versions set the letters in Unbounded next to a cut-out heart.
// That's gone: this is one image now.
export default function Logo({ height = 26, style }: {
  height?: number
  /** kept for call sites that used to tint the type; the art is oxblood */
  color?: string
  style?: React.CSSProperties
}) {
  return (
    <img
      src="/brand/qutenote_logo.png"
      alt="QuteNote"
      style={{ height: `${height}px`, width: 'auto', display: 'block', ...style }}
    />
  )
}
