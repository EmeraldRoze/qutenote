import type { Stroke, Point } from './compileFont'

// Slices a handwritten WORD into its letters — respecting the pen.
//
// Emerald's rule (Oct 18): never slice ink into squares. A pen stroke stays
// WHOLE and belongs to the letter where most of it lives; overlaps are normal
// (a k's arm reaching over the y, an x leaning over the o). The knife only
// comes out for a single continuous stroke that genuinely spans multiple
// letters (true cursive), and it cuts only THAT stroke.

export interface SegmentedLetter {
  char: string
  strokes: Stroke[]
}

export interface SegmentResult {
  letters: SegmentedLetter[]
  confidence: 'high' | 'low' // low = we had to cut a connected stroke
}

// Rough visual width of each character relative to an average letter.
function widthWeight(ch: string): number {
  if ('iljt1.,!'.includes(ch)) return 0.55
  if ('mwMW'.includes(ch)) return 1.6
  if ('fr'.includes(ch)) return 0.8
  return 1
}

function bounds(s: Stroke): { minX: number; maxX: number } {
  let minX = Infinity, maxX = -Infinity
  for (const p of s) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x) }
  return { minX, maxX }
}

function centroidX(s: Stroke): number {
  let sum = 0
  for (const p of s) sum += p.x
  return sum / s.length
}

function pathLength(s: Stroke): number {
  let d = 0
  for (let i = 1; i < s.length; i++) d += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y)
  return d
}

// Cut ONE stroke at a vertical line; pieces keep their own side.
function cutStrokeAtX(stroke: Stroke, x: number): { left: Stroke[]; right: Stroke[] } {
  const left: Stroke[] = []
  const right: Stroke[] = []
  let current: Stroke = []
  let side: 'left' | 'right' | null = null
  const push = () => { if (current.length > 1) (side === 'left' ? left : right).push(current); current = [] }
  for (const p of stroke) {
    const s = p.x <= x ? 'left' : 'right'
    if (side !== null && s !== side) push()
    side = s
    current.push(p)
  }
  push()
  return { left, right }
}

// Group whole strokes into `k` letter groups by the gaps between their
// x-centroids: sort by centroid, split at the k-1 widest centroid gaps.
function groupByCentroid(strokes: Stroke[], k: number): Stroke[][] {
  const items = strokes.map((s) => ({ s, c: centroidX(s) })).sort((a, b) => a.c - b.c)
  if (k <= 1 || items.length <= k) {
    if (items.length === k) return items.map((i) => [i.s])
  }
  const gaps: { idx: number; gap: number }[] = []
  for (let i = 0; i < items.length - 1; i++) gaps.push({ idx: i, gap: items[i + 1].c - items[i].c })
  const cutAfter = new Set(gaps.sort((a, b) => b.gap - a.gap).slice(0, k - 1).map((g) => g.idx))
  const groups: Stroke[][] = [[]]
  for (let i = 0; i < items.length; i++) {
    groups[groups.length - 1].push(items[i].s)
    if (cutAfter.has(i) && groups.length < k) groups.push([])
  }
  while (groups.length < k) groups.push([])
  return groups
}

interface Cluster { strokes: Stroke[]; minX: number; maxX: number }

function clusterStrokes(strokes: Stroke[], tolerance = 8): Cluster[] {
  const items = strokes.map((s) => ({ s, ...bounds(s) })).sort((a, b) => a.minX - b.minX)
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

export function segmentWord(strokes: Stroke[], word: string): SegmentResult {
  const chars = word.split('')
  const drawn = strokes.filter((s) => s.length > 0)
  if (chars.length === 1) {
    return { letters: [{ char: chars[0], strokes: drawn }], confidence: 'high' }
  }

  let clusters = clusterStrokes(drawn)
  let confidence: 'high' | 'low' = 'high'

  // Too many clusters: merge the pair with the smallest gap.
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

  // Decide how many letters each cluster holds (proportional to width).
  const perCluster: string[][] = []
  {
    let idx = 0
    const totalWidth = clusters.reduce((a, c) => a + (c.maxX - c.minX || 1), 0)
    const remainingFor = (ci: number) => clusters.length - 1 - ci
    for (let ci = 0; ci < clusters.length; ci++) {
      const lettersLeft = chars.length - idx
      const clustersLeft = remainingFor(ci)
      let take = Math.max(1, Math.round(((clusters[ci].maxX - clusters[ci].minX || 1) / totalWidth) * chars.length))
      take = Math.min(take, lettersLeft - clustersLeft) // leave at least 1 per remaining cluster
      take = Math.max(take, 1)
      perCluster.push(chars.slice(idx, idx + take))
      idx += take
    }
    // Any letters left over go to the last cluster
    if (idx < chars.length) perCluster[perCluster.length - 1].push(...chars.slice(idx))
  }

  // Resolve each cluster into letter groups of WHOLE strokes.
  const letterGroups: Stroke[][] = []
  for (let ci = 0; ci < clusters.length; ci++) {
    const letters = perCluster[ci]
    let pool = clusters[ci].strokes
    if (letters.length === 1) {
      letterGroups.push(pool)
      continue
    }
    // A stroke that covers most of a multi-letter cluster is connected
    // writing even when the stroke COUNT looks sufficient (one long stroke
    // plus an i-dot, say) — it needs the knife too.
    const clusterSpan = clusters[ci].maxX - clusters[ci].minX || 1
    const hasSpanningStroke = () => pool.some((s) => {
      const b = bounds(s)
      return (b.maxX - b.minX) > 0.7 * clusterSpan
    })

    // Not enough separate strokes for these letters? The writer connected
    // them — cut the widest-spanning stroke at predicted boundaries until
    // there are enough pieces. Only that stroke is cut; neighbors stay whole.
    let safety = 8
    while ((pool.length < letters.length || hasSpanningStroke()) && safety-- > 0) {
      confidence = 'low'
      let widest = 0
      for (let i = 1; i < pool.length; i++) {
        const a = bounds(pool[i]); const b = bounds(pool[widest])
        if (a.maxX - a.minX > b.maxX - b.minX) widest = i
      }
      const target = pool[widest]
      const tb = bounds(target)
      // Predicted internal boundary: width-weighted midpoint of the letters
      const total = letters.reduce((a, c) => a + widthWeight(c), 0)
      let acc = 0
      let cutX = (tb.minX + tb.maxX) / 2
      for (const ch of letters) {
        acc += widthWeight(ch)
        const x = tb.minX + (acc / total) * (tb.maxX - tb.minX)
        if (x > tb.minX + 4 && x < tb.maxX - 4) { cutX = x; break }
      }
      const cut = cutStrokeAtX(target, cutX)
      const pieces = [...cut.left, ...cut.right].filter((p) => p.length > 1)
      if (pieces.length <= 1) break // unsplittable — bail rather than loop
      pool = [...pool.slice(0, widest), ...pieces, ...pool.slice(widest + 1)]
    }
    const groups = groupByCentroid(pool, letters.length)
    letterGroups.push(...groups)
  }

  // Tiny orphan pieces (born from cutting) hop to the neighboring letter
  // whose ink is closest — this is what kills "a little dot in the y".
  for (let i = 0; i < letterGroups.length; i++) {
    const keep: Stroke[] = []
    for (const s of letterGroups[i]) {
      const isTinyFragment = s.length > 1 && pathLength(s) < 14
      if (!isTinyFragment || letterGroups[i].length === 1) { keep.push(s); continue }
      const c = centroidX(s)
      let bestG = i
      let bestD = Infinity
      for (let g = 0; g < letterGroups.length; g++) {
        for (const other of letterGroups[g]) {
          if (other === s || other.length < 2 || pathLength(other) < 14) continue
          const d = Math.abs(centroidX(other) - c)
          if (d < bestD) { bestD = d; bestG = g }
        }
      }
      if (bestG === i) keep.push(s)
      else letterGroups[bestG].push(s)
    }
    letterGroups[i] = keep
  }

  return {
    letters: chars.map((char, i) => ({ char, strokes: letterGroups[i] ?? [] })),
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
