// One badge for every count in the app: neon with an oxblood ring and an
// oxblood numeral, so it reads on paper, on art and on a folder tab
// (Emerald, Oct 29 — plain neon was invisible).
export default function CountBadge({ count, label, style }: {
  count: number
  label: string
  style?: React.CSSProperties
}) {
  if (count <= 0) return null
  return (
    <span aria-label={`${count} ${label}`} style={{
      position: 'absolute', zIndex: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minWidth: '19px', height: '19px', padding: '0 4px', boxSizing: 'border-box',
      borderRadius: '10px', background: 'var(--highlight)', border: '1.6px solid var(--ink)',
      fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, lineHeight: 1,
      color: 'var(--ink)', letterSpacing: 0, textTransform: 'none',
      ...style,
    }}>{count > 99 ? '99+' : count}</span>
  )
}
