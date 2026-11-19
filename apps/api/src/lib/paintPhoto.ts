// Turning a photo into a painting (Emerald, Nov 19 2026).
//
// WHY IT IS BUILT THIS WAY, because it took a whole evening of testing and
// the reasons are not obvious:
//
// 1. WHICH MODEL. Google's editor (nano-banana, via fal) keeps a person's
//    face better than anything else tried, and costs about half what OpenAI
//    charges. OpenAI widened her nose every single time. Plain image-to-image
//    with a strength dial was worse still: one dial moved style and identity
//    together, so by the time it looked painted she was a different woman.
//    Risograph is the one exception and comes from OpenAI — see below.
//
// 2. THE FACE RULE is hers, verbatim: "on faces we don't ever want those big
//    thick strokes". It is in every painterly prompt. The model treats it as
//    a strong preference rather than a law, so the oil is ALSO capped in the
//    app — belt and braces.
//
// 3. REGISTRATION is the non-obvious one. The model hands back a picture
//    that is subtly zoomed and shifted, roughly 2-5% bigger and a dozen
//    pixels across. Invisible on its own; blend it with the original for the
//    strength slider and every edge doubles. She spotted it immediately. So
//    every painting is pulled back into register with the photo before it is
//    stored. It also makes the painting itself more accurate, because the
//    eyes and mouth land back where the camera put them.
import { prisma } from './prisma'

export type Medium = 'watercolour' | 'oil' | 'pencil' | 'ink' | 'risograph'

export const MEDIA: Medium[] = ['watercolour', 'oil', 'pencil', 'ink', 'risograph']

// How far the strength slider may travel, per medium. The oil stops early on
// purpose: past about 60% the model starts leaving pale stroke marks on skin
// no matter what the prompt says, so the cap enforces her rule where the
// words alone do not. Her chosen default is 25.
export const MEDIUM_LIMITS: Record<Medium, { max: number; default: number }> = {
  watercolour: { max: 100, default: 75 },
  oil: { max: 60, default: 25 },
  pencil: { max: 100, default: 80 },
  ink: { max: 100, default: 85 },
  risograph: { max: 100, default: 85 },
}

const FACE_RULE =
  'THE FACE IS NEVER PAINTED WITH BIG THICK STROKES. On all skin, and especially the face, use only small, fine, controlled brush strokes that follow the form. No wide streaks, no palette-knife slabs, no thick blobs of paint anywhere on the face, the neck or the hands, at any point. Large, loose, heavily loaded brushwork is allowed ONLY in the background, the hair and the clothing.'

const KEEP =
  "Change only the medium, nothing else. Keep the face the same shape: the same nostril width and nose shape, any nose ring or piercing, the same closed lips with the same cupid's bow, the same eyes and eyebrows, the same jawline and expression. Keep the hair falling exactly as it does, the same pose, the same framing and the same clothing. Do not beautify, do not slim, do not open the mouth, do not add makeup."

// Risograph has to throw nearly all the colour away, so the strict clause
// above fought the medium and the model simply handed the photo straight
// back, three times. This one protects the SHAPES and frees the colour.
const KEEP_LOOSE =
  'Keep the face exactly the same shape: the same nose and nostrils, any nose ring, the same closed lips, the same eyes and eyebrows, the same expression, the same hair, the same pose and framing. The colours must change completely to suit the printing process, but no feature may move or change shape.'

const PROMPTS: Record<Medium, string> = {
  // NO FACE_RULE HERE, on purpose. Her rule is about big thick strokes, which
  // is an OIL problem: watercolour has no impasto to begin with. Including it
  // (first live test, Nov 19) made the watercolour timid and barely painted,
  // because the wording is all about palette knives and slabs of paint. The
  // rule belongs where the danger is.
  watercolour: `Repaint this photograph as a traditional watercolour painting on cold-pressed paper: generous soft transparent washes, clearly visible brush strokes, pigment pooling and drying darker at the edges of washes, the white of the paper showing through the highlights, visible paper grain, colours bleeding gently into one another, no outlines. It must clearly read as a painting rather than a photograph. ${KEEP}`,
  oil: `Repaint this photograph as a traditional oil painting on canvas. Visible brush strokes and real paint texture throughout, impasto catching the light in the background and the hair, visible canvas weave. ${FACE_RULE} ${KEEP}`,
  pencil: `Redraw this photograph as a hand-drawn graphite pencil sketch. Every part of the drawing must be visibly built from individual pencil strokes: directional hatching and cross-hatching you can clearly see, loose sketchy lines, the grain of the paper breaking up the graphite. It must look hand-drawn, NOT like a black and white photograph and NOT like smooth airbrushed shading. Leave the paper white in the highlights and let the strokes get denser in the shadows. Monochrome graphite on white textured paper. ${KEEP}`,
  ink: `Redraw this photograph as a pen and ink drawing on cream paper: confident dark ink lines, cross hatching for the shadows, no grey wash, the paper left bare in the light areas. ${KEEP}`,
  // OpenAI, not Google: Google refused this one three times, handing the
  // photograph back almost unchanged. OpenAI's high-fidelity edit does a
  // genuine two-ink print. Emerald's call, Nov 19.
  risograph: `Reprint this photograph as a two colour risograph print. Two ink layers slightly out of registration, coarse grain, flat areas of ink, limited palette of one warm red and one blue on off white paper. ${KEEP_LOOSE}`,
}

// ─── The models ─────────────────────────────────────────────────────────────

async function paintWithGoogle(dataUri: string, medium: Medium): Promise<Buffer> {
  const key = process.env.FAL_KEY
  if (!key) throw new Error('FAL_KEY is not set.')
  const r = await fetch('https://fal.run/fal-ai/nano-banana/edit', {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: PROMPTS[medium], image_urls: [dataUri], num_images: 1 }),
  })
  const j: any = await r.json().catch(() => null)
  const url = j?.images?.[0]?.url
  if (!url) throw new Error(`Google returned no image (${r.status}).`)
  return Buffer.from(await (await fetch(url)).arrayBuffer())
}

async function paintWithOpenAI(photo: Buffer, medium: Medium): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set.')
  const form = new FormData()
  form.append('model', 'gpt-image-1.5')
  form.append('image', new Blob([new Uint8Array(photo)], { type: 'image/png' }), 'photo.png')
  form.append('prompt', PROMPTS[medium])
  form.append('size', '1024x1024')
  form.append('n', '1')
  // the only setting that stops it redrawing the face
  form.append('input_fidelity', 'high')
  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  const j: any = await r.json().catch(() => null)
  const b64 = j?.data?.[0]?.b64_json
  if (!b64) throw new Error(`OpenAI returned no image (${r.status}): ${String(j?.error?.message ?? '').slice(0, 120)}`)
  return Buffer.from(b64, 'base64')
}

// ─── Registration ───────────────────────────────────────────────────────────

/**
 * Undo the model's zoom and shift so the painting sits exactly over the photo.
 *
 * A coarse search rather than anything clever: the drift is a plain scale and
 * offset, so trying a few hundred combinations on thumbnails and keeping the
 * best one is both quicker and far more reliable than optical flow, which was
 * tried first and failed because a painting does not look like a photograph.
 */
export async function registerToPhoto(painted: Buffer, photo: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  const N = 128 // thumbnails to search on

  const grey = async (buf: Buffer) =>
    sharp(buf).resize(N, N, { fit: 'fill' }).greyscale().raw().toBuffer()

  const [a, b] = await Promise.all([grey(photo), grey(painted)])

  const sample = (img: Buffer, x: number, y: number) => {
    const xi = x < 0 ? 0 : x > N - 1 ? N - 1 : x | 0
    const yi = y < 0 ? 0 : y > N - 1 ? N - 1 : y | 0
    return img[yi * N + xi]
  }

  let best = { score: Infinity, scale: 1, dx: 0, dy: 0 }
  for (let s = 0.92; s <= 1.085; s += 0.01) {
    for (let dx = -8; dx <= 8; dx += 1) {
      for (let dy = -8; dy <= 8; dy += 1) {
        let sum = 0
        // every 3rd pixel is plenty and keeps this fast
        for (let y = 4; y < N - 4; y += 3) {
          for (let x = 4; x < N - 4; x += 3) {
            const sx = (x - N / 2) * s + N / 2 + dx
            const sy = (y - N / 2) * s + N / 2 + dy
            const d = a[y * N + x] - sample(b, sx, sy)
            sum += d * d
          }
        }
        if (sum < best.score) best = { score: sum, scale: s, dx, dy }
      }
    }
  }

  // Apply the winning transform at full size.
  //
  // The search says: to find photo pixel (x,y), look in the painting at
  // (x - mid) * scale + mid + d. So the matching region of the painting is a
  // box `scale` of the full size, centred `d` away from the middle, which is
  // then stretched back to fill the frame.
  //
  // The painting is padded first so the box can sit partly outside the
  // original edges, which happens whenever the scale is above 1. Getting
  // this wrong is what made the first version a silent no-op.
  const meta = await sharp(photo).metadata()
  const W = meta.width ?? 1024
  const H = meta.height ?? 1024
  const k = W / N // the search ran on thumbnails; scale its offsets up

  const pad = Math.ceil(W * 0.25)
  const padded = await sharp(painted)
    .resize(W, H, { fit: 'fill' })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: 'copy' })
    .toBuffer()

  const cropW = Math.max(8, Math.round(W * best.scale))
  const cropH = Math.max(8, Math.round(H * best.scale))
  const cx = pad + W / 2 + best.dx * k
  const cy = pad + H / 2 + best.dy * k
  const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

  return sharp(padded)
    .extract({
      left: clamp(Math.round(cx - cropW / 2), 0, W + 2 * pad - cropW),
      top: clamp(Math.round(cy - cropH / 2), 0, H + 2 * pad - cropH),
      width: cropW,
      height: cropH,
    })
    .resize(W, H, { fit: 'fill' })
    .png()
    .toBuffer()
}

// ─── The job ────────────────────────────────────────────────────────────────

export async function paintUpload(uploadId: string, medium: Medium, userId: string): Promise<{ id: string; url: string }> {
  const original = await prisma.upload.findUnique({ where: { id: uploadId } })
  if (!original) throw new Error('That photo is no longer here.')
  if (!original.mime.startsWith('image/')) throw new Error('That is not a photo.')

  const photo = Buffer.from(original.data)
  const dataUri = `data:${original.mime};base64,${photo.toString('base64')}`

  const raw = medium === 'risograph'
    ? await paintWithOpenAI(photo, medium)
    : await paintWithGoogle(dataUri, medium)

  const registered = await registerToPhoto(raw, photo)

  const saved = await prisma.upload.create({
    data: { userId, mime: 'image/png', data: registered },
    select: { id: true },
  })
  const base = process.env.WEB_URL ?? 'https://qutenote.com'
  return { id: saved.id, url: `${base}/api/uploads/${saved.id}` }
}
