# Numbers chart → sprites. The chart has faint ghost numerals in the
# background and a stray printed label under the 0, so segmentation uses a
# STRONG ink threshold and sprites keep only components near the main glyph.
from PIL import Image
import numpy as np
import json, os

S = '/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad/flower'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'flower')
im = Image.open(f'{S}/numbers.jpg').convert('L')
w, h = im.size
arr = np.asarray(im)
STRONG = 140  # real ink only; ghosts are lighter

# row bands from strong ink
rows = (arr < STRONG).sum(axis=1)
bands = []
in_b = False
for y, v in enumerate(rows.tolist()):
    if v > 0 and not in_b: start = y; in_b = True
    elif v == 0 and in_b:
        if y - start > 60: bands.append((start, y))
        in_b = False
if in_b: bands.append((start, h))
print('bands:', bands)
names = [['0', '1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']]
assert len(bands) == 3, bands

def components(mask):
    lab = np.zeros(mask.shape, dtype=np.int32)
    cur = 0
    for sy, sx in zip(*np.nonzero(mask)):
        if lab[sy, sx]: continue
        cur += 1
        stack = [(sy, sx)]
        lab[sy, sx] = cur
        while stack:
            y0, x0 = stack.pop()
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                yy, xx = y0+dy, x0+dx
                if 0 <= yy < mask.shape[0] and 0 <= xx < mask.shape[1] and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = cur
                    stack.append((yy, xx))
    return lab, cur

meta_out = {}
for bi, (by0, by1) in enumerate(bands):
    band = arr[by0:by1]
    cols = (band < STRONG).sum(axis=0)
    segs = []
    in_s = False
    for x, v in enumerate(cols.tolist()):
        if v > 0 and not in_s: sx = x; in_s = True
        elif v == 0 and in_s:
            if x - sx > 12: segs.append([sx, x])
            in_s = False
    if in_s: segs.append([sx, w])
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < 30: merged[-1][1] = s[1]
        else: merged.append(list(s))
    print('band', bi, [tuple(m) for m in merged])
    for ci, (x0, x1) in enumerate(merged[:len(names[bi])]):
        digit = names[bi][ci]
        cell = arr[by0:by1, x0:x1].astype(np.float32)
        # label strip: the printed digit at the top of the cell — cut below it
        strong_rows = (cell < STRONG).sum(axis=1)
        y = 0
        n = len(strong_rows)
        while y < n and strong_rows[y] == 0: y += 1
        label_start = y
        while y < n and strong_rows[y] > 0: y += 1
        gap = 0
        while y < n and gap < 10:
            gap = gap + 1 if strong_rows[y] == 0 else 0
            y += 1
        # if the "label" band is actually tall, it was the glyph (no label in this cell)
        glyph_top = y if (y - label_start) < (by1 - by0) * 0.45 else 0
        cell = cell[glyph_top:]
        a = np.clip((230 - cell) / (230 - 25), 0, 1) ** 0.8
        alpha = (a * 255).astype(np.uint8)
        mask = alpha > 90
        lab, ncomp = components(mask)
        if not ncomp: raise SystemExit(f'empty {digit}')
        sizes = [(lab == i).sum() for i in range(1, ncomp + 1)]
        main = int(np.argmax(sizes)) + 1
        keep = {main}
        changed = True
        def bbox(sel):
            ys, xs = np.nonzero(sel)
            return ys.min(), xs.min(), ys.max(), xs.max()
        while changed:
            changed = False
            ky0, kx0, ky1, kx1 = bbox(np.isin(lab, list(keep)))
            for i in range(1, ncomp + 1):
                if i in keep: continue
                iy0, ix0, iy1, ix1 = bbox(lab == i)
                dy = max(ky0 - iy1, iy0 - ky1, 0)
                dx = max(kx0 - ix1, ix0 - kx1, 0)
                if sizes[i - 1] >= 0.05 * sizes[main - 1] or (dy * dy + dx * dx) ** 0.5 <= 18:
                    keep.add(i)
                    changed = True
        alpha[~np.isin(lab, list(keep))] = 0
        ys, xs = np.nonzero(alpha > 25)
        t, b, l, r = ys.min(), ys.max(), xs.min(), xs.max()
        alpha = alpha[t:b + 1, l:r + 1]
        hh, ww = alpha.shape
        rgba = np.zeros((hh, ww, 4), dtype=np.uint8)
        rgba[..., 0] = 46; rgba[..., 1] = 36; rgba[..., 2] = 64
        rgba[..., 3] = alpha
        Image.fromarray(rgba).save(os.path.join(OUT, f'num-{digit}.png'), optimize=True)
        meta_out[digit] = {'w': int(ww), 'h': int(hh)}
        print(digit, ww, hh)

mp = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'flowerGlyphs.json')
full = json.load(open(mp))
full['numbers'] = meta_out
json.dump(full, open(mp, 'w'))
print('saved numbers:', sorted(meta_out.keys()))
