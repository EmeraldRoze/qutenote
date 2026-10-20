from PIL import Image, ImageDraw
import json, math, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'flower')
meta = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'flowerGlyphs.json')))
H = 200

def bouquet(word, florist):
    n = len(word)
    if florist and n > 6:
        max_a = min(62, 16 + n * 4.2)
        W = int(H * (0.9 + 0.17 * n))
    else:
        max_a = 0 if n == 1 else min(46, 10 + n * 7)
        W = int(H * 2.4)
    canvas = Image.new('RGBA', (W, int(H * 1.3)), (255, 255, 255, 255))
    tie = (canvas.width // 2, int(H * 1.12))
    for i, ch in enumerate(word):
        g = meta['letters'].get(ch)
        if not g: continue
        ang = -max_a + (2 * max_a * i / (n - 1)) if n > 1 else 0
        base = 0.86 + 0.14 * ((i * 2654435761) % 97) / 97
        # florist trick: on crowded bouquets alternate a short inner rank and
        # a tall outer rank so blooms sit in two bands instead of one pile
        rank = (0.74 if i % 2 else 1.0) if (florist and n > 6) else 1.0
        scale = base * rank * H / g['h']
        sp = Image.open(os.path.join(OUT, ch + '.png'))
        sp = sp.resize((max(1, int(g['w'] * scale)), max(1, int(g['h'] * scale))))
        rot = sp.rotate(-ang, expand=True, resample=Image.BICUBIC)
        a = math.radians(ang)
        bx, by = 0, sp.height / 2
        rx = bx * math.cos(a) - by * math.sin(a)
        ry = bx * math.sin(a) + by * math.cos(a)
        px = tie[0] - rot.width / 2 - rx
        py = tie[1] - rot.height / 2 - ry
        canvas.alpha_composite(rot, (int(px), int(py)))
    return canvas

before = bouquet('hippopotamus', False)
after = bouquet('hippopotamus', True)
small = bouquet('love', True)
W = before.width + after.width + small.width + 80
strip = Image.new('RGBA', (W, int(H * 1.5)), (255, 255, 255, 255))
d = ImageDraw.Draw(strip)
x = 0
for img, label in [(before, 'hippopotamus — NOW'), (after, 'hippopotamus — PROPOSED'), (small, 'love (unchanged)')]:
    strip.alpha_composite(img, (x, 0))
    d.text((x + img.width // 2 - 60, int(H * 1.35)), label, fill=(60, 50, 90))
    x += img.width + 40
strip.convert('RGB').save('/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad/flower/longword.png')
print('ok')
