import type { Stroke, Point } from './compileFont'

// Slices a handwritten WORD into its letters.
//
// Strategy: pen strokes that overlap horizontally belong to the same letter
// (an i's dot sits over its stem), so first cluster strokes by x-overlap.
// If that gives exactly one cluster per letter, done. Too many clusters →
// merge the two with the smallest gap until the count fits. Too few (the
// writer connected letters in one stroke) → cut the widest clusters at
// boundaries predicted from typical letter widths, splitting strokes at the
// cut line. The preview step in the UI is the safety net for wild cursive.

export interface SegmentedLetter {
  char: string
  strokes: Stroke[]
}

export interface SegmentResult {
  letters: SegmentedLetter[]
  confidence: 'high' | 'low' // low = we had to cut connected strokes
}

// Rough visual width of each character relative to an average letter —
// used to predict where to cut a connected run.
function widthWeight(ch: string): number {
  if ('iljt1.,!'.includes(ch)) return 0.55
  if ('mwMW'.includes(ch)) return 1.6
  if ('fr'.includes(ch)) return 0.8
  return 1
}

interface Cluster { strokes: Stroke[]; minX: number; maxX: number }

function strokeBounds(s: Stroke): { minX: number; maxX: number } {
  let minX = Infinity, maxX = -Infinity
  for (const p of s) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x) }
  return { minX, maxX }
}

function clusterStrokes(strokes: Stroke[], tolerance = 8): Cluster[] {
  const items = strokes.map((s) => ({ s, ...strokeBounds(s) })).sort((a, b) => a.minX - b.minX)
  const clusters: Cluster[] = []
  for (const it of items) {
    const last = clusters[clusters.length - 1]
    if (last && it.minX <= last.maxX + tolerance) {
      last.strokes.push(it.s)
      last.maxX = Math.max(last.maxX, it.maxX)
    } else {
      clusters.push({ strokes: [it.s], minX: it.minX, maxX: it.maxX })
    }
  }
  return clusters
}

// Cut one stroke at a vertical line: every crossing starts a new sub-stroke.
function cutStrokeAtX(stroke: Stroke, x: number): { left: Stroke[]; right: Stroke[] } {
  const left: Stroke[] = []
  const right: Stroke[] = []
  let current: Stroke = []
  let side: 'left' | 'right' | null = null
  const push = () => {
    if (current.length) (side === 'left' ? left : right).push(current)
    current = []
  }
  for (const p of stroke) {
    const s = p.x <= x ? 'left' : 'right'
    if (side !== null && s !== side) push()
    side = s
    current.push(p)
  }
  push()
  return { left, right }
}

// Split a cluster holding `chars` (2+ letters written connected) into one
// cluster per letter, cutting at width-weighted boundaries.
function splitCluster(cluster: Cluster, chars: string[]): Cluster[] {
  const total = chars.reduce((a, c) => a + widthWeight(c), 0)
  const width = cluster.maxX - cluster.minX
  const result: Cluster[] = []
  let remaining = cluster.strokes
  let cursor = cluster.minX
  for (let i = 0; i < chars.length - 1; i++) {
    cursor += (widthWeight(chars[i]) / total) * width
    const leftStrokes: Stroke[] = []
    const rightStrokes: Stroke[] = []
    for (const s of remaining) {
      const b = strokeBounds(s)
      if (b.maxX <= cursor) leftStrokes.push(s)
      else if (b.minX > cursor) rightStrokes.push(s)
      else {
        const cut = cutStrokeAtX(s, cursor)
        leftStrokes.push(...cut.left)
        rightStrokes.push(...cut.right)
      }
    }
    result.push({ strokes: leftStrokes, minX: cursor - 1, maxX: cursor })
    remaining = rightStrokes
  }
  result.push({ strokes: remaining, minX: cursor, maxX: cluster.maxX })
  return result
}

export function segmentWord(strokes: Stroke[], word: string): SegmentResult {
  const chars = word.split('')
  const drawn = strokes.filter((s) => s.length > 0)
  if (chars.length === 1) {
    return { letters: [{ char: chars[0], strokes: drawn }], confidence: 'high' }
  }

  let clusters = clusterStrokes(drawn)
  let confidence: 'high' | 'low' = 'high'

  // Too many clusters: merge the pair with the smallest gap between them.
  while (clusters.length > chars.length) {
    let best = 0
    let bestGap = Infinity
    for (let i = 0; i < clusters.length - 1; i++) {
      const gap = clusters[i + 1].minX - clusters[i].maxX
      if (gap < bestGap) { bestGap = gap; best = i }
    }
    clusters[best] = {
      strokes: [...clusters[best].strokes, ...clusters[best + 1].strokes],
      minX: clusters[best].minX,
      maxX: Math.max(clusters[best].maxX, clusters[best + 1].maxX),
    }
    clusters.splice(best + 1, 1)
  }

  // Too few clusters: letters were written connected — cut the widest ones.
  while (clusters.length < chars.length) {
    confidence = 'low'
    // How many letters each cluster should hold, by proportional width
    const deficit = chars.length - clusters.length
    let widest = 0
    for (let i = 1; i < clusters.length; i++) {
      if (clusters[i].maxX - clusters[i].minX > clusters[widest].maxX - clusters[widest].minX) widest = i
    }
    // Letters assigned to each cluster by order: give the widest one extra
    const counts = clusters.map(() => 1)
    counts[widest] += deficit
    let idx = 0
    const next: Cluster[] = []
    for (let i = 0; i < clusters.length; i++) {
      const take = chars.slice(idx, idx + counts[i])
      idx += counts[i]
      if (counts[i] === 1) next.push(clusters[i])
      else next.push(...splitCluster(clusters[i], take))
    }
    clusters = next
  }

  return {
    letters: chars.map((char, i) => ({ char, strokes: clusters[i]?.strokes ?? [] })),
    confidence,
  }
}

// Map one extracted letter from word-canvas coordinates into the storage
// space the font compiler expects (300x300 box, baseline at y=220) while
// PRESERVING where the ink sat relative to the word's baseline — that is the
// honest signal for descenders and letter height, straight from real flow.
export function toGlyphSpace(strokes: Stroke[], wordBaselineY: number): Stroke[] {
  let minX = Infinity
  for (const s of strokes) for (const p of s) minX = Math.min(minX, p.x)
  if (!Number.isFinite(minX)) return []
  const shift = (p: Point): Point => ({ x: p.x - minX + 30, y: p.y - wordBaselineY + 220 })
  return strokes.map((s) => s.map(shift))
}
