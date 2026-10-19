from PIL import Image
import json, sys
sys.setrecursionlimit(100000)

S = '/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad'
im = Image.open(f'{S}/secret/alphabet.jpg').convert('L')
TH = 150
SCALE = 3
bboxes = json.load(open(f'{S}/secret/bboxes.json'))

def rdp(pts, eps):
    if len(pts) < 3: return pts
    def dist(pp, a, b):
        ax, ay = a; bx, by = b; qx, qy = pp
        dx, dy = bx - ax, by - ay
        L = (dx * dx + dy * dy) ** 0.5
        if L < 1e-9:  # degenerate segment (closed loop) — distance to the point
            return ((qx - ax) ** 2 + (qy - ay) ** 2) ** 0.5
        return abs(dy * qx - dx * qy + bx * ay - by * ax) / L
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        dd = dist(pts[i], pts[0], pts[-1])
        if dd > dmax: dmax, idx = dd, i
    if dmax > eps:
        l = rdp(pts[:idx + 1], eps); r = rdp(pts[idx:], eps)
        return l[:-1] + r
    return [pts[0], pts[-1]]

def trace(bb):
    x0, y0, x1, y1 = bb
    crop = im.crop((x0 - 1, y0 - 1, x1 + 2, y1 + 2))
    big = crop.resize((crop.width * SCALE, crop.height * SCALE), Image.BICUBIC)
    w, h = big.size
    p = big.load()
    ink = [[1 if p[x, y] < TH else 0 for x in range(w)] for y in range(h)]
    def get(x, y):
        return ink[y][x] if 0 <= x < w and 0 <= y < h else 0
    nxt = {}
    for y in range(h):
        for x in range(w):
            if not ink[y][x]: continue
            if not get(x, y - 1): nxt[(x, y)] = (x + 1, y)
            if not get(x + 1, y): nxt[(x + 1, y)] = (x + 1, y + 1)
            if not get(x, y + 1): nxt[(x + 1, y + 1)] = (x, y + 1)
            if not get(x - 1, y): nxt[(x, y + 1)] = (x, y)
    loops = []
    visited = set()
    for start in list(nxt.keys()):
        if start in visited: continue
        loop = [start]
        cur = start
        while True:
            visited.add(cur)
            cur = nxt.get(cur)
            if cur is None or cur == start: break
            loop.append(cur)
        if cur == start and len(loop) >= 8:
            loops.append(loop)
    out = []
    for loop in loops:
        closed = loop + [loop[0]]
        simp = rdp(closed, 2.0)[:-1]
        if len(simp) >= 3:
            out.append([[round(q[0] / SCALE, 2), round(q[1] / SCALE, 2)] for q in simp])
    return { 'w': w / SCALE, 'h': h / SCALE, 'contours': out }

traced = {}
for L, bb in bboxes.items():
    t = trace(tuple(bb))
    traced[L] = t
    print(L, 'contours:', len(t['contours']), 'pts:', sum(len(c) for c in t['contours']))
json.dump(traced, open(f'{S}/secret/contours.json', 'w'))
print('saved')
