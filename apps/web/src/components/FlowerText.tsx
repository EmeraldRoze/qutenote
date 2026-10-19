import { flowerPieces, type BouquetWord } from '../lib/flower'

// Renders a message in the Flower Language: each word is a tied bouquet
// (letters fan left to right), punctuation stands between bouquets as its own
// botanical mark, numbers and anything unmapped print as plain text. `size`
// is the bouquet height in px.

function Bouquet({ word, size }: { word: BouquetWord; size: number }) {
  const W = word.width * size
  const H = word.height * size
  const tieX = W * word.tieX
  const tieY = H * 0.97
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {word.stems.map((s, i) => {
        const h = s.scale * size
        const w = (s.w / s.h) * h
        return (
          <image
            key={i}
            href={s.src}
            width={w}
            height={h}
            x={-w / 2}
            y={-h}
            transform={`translate(${tieX} ${tieY}) rotate(${s.angle})`}
            style={{ transformOrigin: '0 0' }}
          />
        )
      })}
    </svg>
  )
}

export default function FlowerText({ text, size = 64 }: { text: string; size?: number }) {
  const pieces = flowerPieces(text)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: `${size * 0.12}px`, rowGap: `${size * 0.18}px`, filter: 'grayscale(1)' }}>
      {pieces.map((p, i) => {
        if (p.kind === 'word') return <Bouquet key={i} word={p} size={size} />
        if (p.kind === 'mark') {
          const h = p.heightFactor * size
          const w = (p.sprite.w / p.sprite.h) * h
          return (
            <img
              key={i}
              src={p.sprite.src}
              alt=""
              width={w}
              height={h}
              style={{ display: 'block', marginBottom: p.raise ? `${size * 0.6}px` : `${size * 0.04}px` }}
            />
          )
        }
        return (
          <span key={i} style={{ fontFamily: "'Fraunces', serif", fontSize: `${size * 0.3}px`, lineHeight: 1, paddingBottom: `${size * 0.06}px` }}>
            {p.text}
          </span>
        )
      })}
    </div>
  )
}
