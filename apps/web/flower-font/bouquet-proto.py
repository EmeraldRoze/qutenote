# Prototype the bouquet layout to eyeball before writing the TS component.
from PIL import Image
import json, math, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'flower')
meta = json.load(open(os.path.join(OUT, 'glyphs.json')))

H = 220  # bouquet height in px for the proto

def bouquet(word):
    n = len(word)
    max_a = 0 if n == 1 else min(46, 10 + n * 7)
    canvas = Image.new('RGBA', (int(H * 2.4), int(H * 1.25)), (255, 255, 255, 255))
    tie = (canvas.width // 2, int(H * 1.08))
    for i, ch in enumerate(word):
        g = meta['letters'].get(ch)
        if not g: continue
        ang = -max_a + (2 * max_a * i / (n - 1)) if n > 1 else 0
        scale = (0.86 + 0.14 * ((i * 2654435761) % 97) / 97) * H / g['h']
        sp = Image.open(os.path.join(OUT, ch + '.png'))
        sp = sp.resize((max(1, int(g['w'] * scale)), max(1, int(g['h'] * scale))))
        rot = sp.rotate(-ang, expand=True, resample=Image.BICUBIC)
        # anchor: sprite bottom-center rotated about itself, placed at tie
        a = math.radians(ang)
        cx, cy = sp.width / 2, sp.height / 2
        bx, by = 0, sp.height / 2  # bottom-center offset from sprite center
        rx = bx * math.cos(a) - by * math.sin(a)
        ry = bx * math.sin(a) + by * math.cos(a)
        px = tie[0] - rot.width / 2 - rx
        py = tie[1] - rot.height / 2 - ry
        canvas.alpha_composite(rot, (int(px), int(py)))
    return canvas

words = ['love', 'you', 'a', 'wildflower']
strip = Image.new('RGBA', (sum(int(H*2.4) for _ in words), int(H*1.25)), (255,255,255,255))
x = 0
for wo in words:
    b = bouquet(wo)
    strip.alpha_composite(b, (x, 0))
    x += b.width
strip.convert('RGB').save('/private/tmp/claude-501/-Users-emmarosecohen/f9d37979-3cd5-415b-aca4-aa88ae0501e5/scratchpad/flower/bouquet_proto.png')
print('ok')
