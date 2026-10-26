// Her painted icons (public/emoji/*.png) in place of drawn SVG ones —
// chevrons, magnifying glass, bell, gear, QR (Emerald, Oct 25: no old icons).
// Unlike QEmoji this keeps the art's own proportions: you set the height and
// the width follows, so a tall chevron stays a chevron.
export default function QIcon({ name, size = 20, style }: {
  name: string
  size?: number
  style?: React.CSSProperties
}) {
  return (
    <img
      src={`/emoji/${name}.png`}
      alt=""
      aria-hidden
      style={{ height: `${size}px`, width: 'auto', objectFit: 'contain', display: 'block', flex: 'none', ...style }}
    />
  )
}
