# Builds the Flower Language sprites from Emerald's charts: each glyph becomes
# a trimmed transparent PNG whose alpha is the ink (luminance inverted), so the
# app can tint it any ink color. Outputs to ../public/flower/ + glyphs.json.
from PIL import Image
import numpy as np
import json, os

S = '/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad/flower'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'flower')
os.makedirs(OUT, exist_ok=True)

alpha_img = Image.open(f'{S}/alphabet.png').convert('L')
punct_img = Image.open(f'{S}/punct.jpg').convert('L')
abb = json.load(open(f'{S}/alpha_bboxes.json'))
pbb = json.load(open(f'{S}/punct_bboxes.json'))

MARK_NAMES = {
    '.': 'period', ',': 'comma', ':': 'colon', ';': 'semicolon', '!': 'exclam',
    '?': 'question', '(': 'paren-open', ')': 'paren-close', 'qo': 'quote-open',
    'qc': 'quote-close', '-': 'hyphen', 'em': 'emdash', '[': 'bracket-open',
    ']': 'bracket-close', '{': 'brace-open', '}': 'brace-close', '/': 'slash',
}

def sprite(im, bb, name, floor=235):
    x0, y0, x1, y1 = bb
    crop = np.asarray(im.crop((x0, y0, x1, y1)), dtype=np.float32)
    # luminance -> alpha: cream (~floor) = 0, black = 255; mild gamma keeps thin strokes visible
    a = np.clip((floor - crop) / (floor - 25), 0, 1) ** 0.8
    alpha = (a * 255).astype(np.uint8)
    # trim to real ink
    ys, xs = np.nonzero(alpha > 25)
    if not len(ys): raise SystemExit(f'empty sprite {name}')
    t, b, l, r = ys.min(), ys.max(), xs.min(), xs.max()
    alpha = alpha[t:b + 1, l:r + 1]
    h, w = alpha.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0] = 46; rgba[..., 1] = 36; rgba[..., 2] = 64  # note-ink #2E2440
    rgba[..., 3] = alpha
    Image.fromarray(rgba).save(os.path.join(OUT, f'{name}.png'), optimize=True)
    return {'w': int(w), 'h': int(h)}

meta = {'letters': {}, 'marks': {}}
for L in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
    meta['letters'][L.lower()] = sprite(alpha_img, abb[L], L.lower())
for k, name in MARK_NAMES.items():
    meta['marks'][k] = {'name': name, **sprite(punct_img, pbb[k], name)}

json.dump(meta, open(os.path.join(OUT, 'glyphs.json'), 'w'))
total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print('sprites:', len(os.listdir(OUT)) - 1, 'total KB:', total // 1024)
