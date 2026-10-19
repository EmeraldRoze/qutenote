# Traces Emerald's flower alphabet + punctuation charts into contours.json.
# Sources (session scratchpad): flower/alphabet.png, flower/punct.jpg
from PIL import Image
import numpy as np
import json, sys
sys.setrecursionlimit(1000000)

S = '/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad/flower'
SCALE = 2

def rdp(pts, eps):
    if len(pts) < 3: return pts
    def dist(pp, a, b):
        ax, ay = a; bx, by = b; qx, qy = pp
        dx, dy = bx - ax, by - ay
        L = (dx * dx + dy * dy) ** 0.5
        if L < 1e-9:
            return ((qx - ax) ** 2 + (qy - ay) ** 2) ** 0.5
        return abs(dy * qx - dx * qy + bx * ay - by * ax) / L
    stack = [(0, len(pts) - 1)]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    while stack:
        i0, i1 = stack.pop()
        dmax, idx = 0, i0
        for i in range(i0 + 1, i1):
            dd = dist(pts[i], pts[i0], pts[i1])
            if dd > dmax: dmax, idx = dd, i
        if dmax > eps:
            keep[idx] = True
            stack.append((i0, idx)); stack.append((idx, i1))
    return [q for q, k in zip(pts, keep) if k]

def trace(im, bb, th):
    x0, y0, x1, y1 = bb
    crop = im.crop((x0 - 1, y0 - 1, x1 + 2, y1 + 2))
    big = crop.resize((crop.width * SCALE, crop.height * SCALE), Image.BICUBIC)
    w, h = big.size
    a = np.asarray(big) < th
    pad = np.zeros((h + 2, w + 2), bool)
    pad[1:-1, 1:-1] = a
    core = pad[1:-1, 1:-1]
    nxt = {}
    ys, xs = np.nonzero(core & ~pad[:-2, 1:-1])   # open above
    for x, y in zip(xs.tolist(), ys.tolist()): nxt[(x, y)] = (x + 1, y)
    ys, xs = np.nonzero(core & ~pad[1:-1, 2:])    # open right
    for x, y in zip(xs.tolist(), ys.tolist()): nxt[(x + 1, y)] = (x + 1, y + 1)
    ys, xs = np.nonzero(core & ~pad[2:, 1:-1])    # open below
    for x, y in zip(xs.tolist(), ys.tolist()): nxt[(x + 1, y + 1)] = (x, y + 1)
    ys, xs = np.nonzero(core & ~pad[1:-1, :-2])   # open left
    for x, y in zip(xs.tolist(), ys.tolist()): nxt[(x, y + 1)] = (x, y)
    loops = []
    visited = set()
    for start in list(nxt.keys()):
        if start in visited: continue
        loop = [start]
        seen_here = {start}
        cur = start
        closed = False
        while True:
            visited.add(cur)
            cur = nxt.get(cur)
            if cur is None: break
            if cur == start:
                closed = True
                break
            if cur in seen_here or cur in visited:  # corrupted chain — bail
                break
            seen_here.add(cur)
            loop.append(cur)
        if closed and len(loop) >= 10:
            loops.append(loop)
    out = []
    for loop in loops:
        closed = loop + [loop[0]]
        simp = rdp(closed, 1.6)[:-1]
        if len(simp) >= 3:
            out.append([[round(q[0] / SCALE, 1), round(q[1] / SCALE, 1)] for q in simp])
    return {'w': round(w / SCALE, 1), 'h': round(h / SCALE, 1), 'contours': out}

alpha = Image.open(f'{S}/alphabet.png').convert('L')
punct = Image.open(f'{S}/punct.jpg').convert('L')
abb = json.load(open(f'{S}/alpha_bboxes.json'))
pbb = json.load(open(f'{S}/punct_bboxes.json'))

letters = {}
for L in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
    letters[L.lower()] = trace(alpha, tuple(abb[L]), 210)
    print(L, len(letters[L.lower()]['contours']))

marks = {}
marks[','] = trace(alpha, tuple(abb[',']), 225)  # the faint wisp from the alphabet chart
for k, bb in pbb.items():
    th = 225 if k == ',' else 210
    marks[k] = trace(punct, tuple(bb), th)
    print(repr(k), len(marks[k]['contours']))

json.dump({'letters': letters, 'marks': marks}, open('contours.json', 'w'))
print('saved', len(letters), 'letters,', len(marks), 'marks')
