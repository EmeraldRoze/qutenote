// Turning a photo into a painting (Emerald, Nov 19 2026).
//
// WHY IT IS BUILT THIS WAY, because it took a whole evening of testing and
// the reasons are not obvious:
//
// 1. WHICH MODEL: `gpt-image-1.5` with input_fidelity high AND quality high.
//    Settled by a three-way bake-off on her family photo (Nov 20). The long
//    road, so nobody walks it again:
//    - Google (nano-banana): "they kinda look like when AI first came out."
//    - chatgpt-image-latest, no fidelity: gorgeous paintings that quietly
//      re-stage the scene. Her: "Nooo you're changing the image!"
//    - chatgpt-image-latest + fidelity: closer, "still changes her face."
//    - gpt-image-1.5 + fidelity + QUALITY HIGH: the only one that kept her
//      exact laugh and head angle, and still arrives as a painting. The two
//      switches were only ever tested separately before; fidelity WITHOUT
//      quality high is what looked photographic on Nov 19.
//
// 2. THE FACE RULE is hers, verbatim: "on faces we don't ever want those big
//    thick strokes". It applies to the OIL ONLY — watercolour has no impasto,
//    and including it there made the painting timid (proven on the first live
//    render). The model treats it as a preference rather than a law, so the
//    oil slider is ALSO capped at 60 in the app.
//
// 3. REGISTRATION is the non-obvious one. The model hands back a picture
//    that is subtly zoomed and shifted, roughly 2-5% bigger and a dozen
//    pixels across. Invisible on its own; blend it with the original for the
//    strength slider and every edge doubles. She spotted it immediately. So
//    every painting is pulled back into register with the photo before it is
//    stored. It also makes the painting itself more accurate, because the
//    eyes and mouth land back where the camera put them.
import { prisma } from './prisma'

// Pencil was cut on her call (Emerald, Nov 20: "i dont think its good").
export type Medium = 'watercolour' | 'oil' | 'ink' | 'risograph'

// What we hand the model. It paints at about this size whatever we send.
const SEND_PX = 1024
// What we keep. A 6x4 card at 300dpi needs 1875px, so this clears print with
// room to spare without storing pointless upscaled pixels.
const MAX_STORED_PX = 2048

export const MEDIA: Medium[] = ['watercolour', 'oil', 'ink', 'risograph']

// How far the strength slider may travel, per medium. Oil UNCAPPED Nov 20 on
// her word: the 60 cap guarded against the OLD painter's thick slabs on
// faces; the current painter puts fine strokes on faces and thick ones in
// the scenery on its own (see design/oil-reference-dog.png), and the cap was
// why oil read as "weird and blurry" — a full oil painting was unreachable.
export const MEDIUM_LIMITS: Record<Medium, { max: number; default: number }> = {
  watercolour: { max: 100, default: 75 },
  oil: { max: 100, default: 75 },
  ink: { max: 100, default: 85 },
  risograph: { max: 100, default: 85 },
}

// HER WORDING (Emerald, Nov 19). This is the whole prompt, and it beat
// every long one I wrote.
//
// I had grown these to two hundred words of rules: protect the face, protect
// the scene, do not beautify, do not re-pose, no slabs of paint. Her note:
// "You need to change the prompt and just say something like without
// changing anything to this photo make it look like it is an oil painting."
//
// She was right, and the evidence was not subtle. The long prompts sat in a
// trap where locking the composition tightly left almost no medium, and
// loosening it let the model re-stage the whole picture (it once turned a
// framed print on a wall into a portrait, deleting the room). One plain
// sentence does BOTH: the scene survives intact and the medium actually
// arrives. It also rescued the risograph, which had refused three times
// under the longer wording.
//
// So: resist padding these. If a medium misbehaves, change the NOUN, do not
// add rules.
const PROMPTS: Record<Medium, string> = {
  watercolour: 'Without changing anything to this photo, can you make it look like it is a watercolor painting?',
  oil: 'Without changing anything to this photo, can you make it look like it is an oil painting?',
  ink: 'Without changing anything to this photo, can you make it look like it is a pen and ink drawing?',
  risograph: 'Without changing anything to this photo, can you make it look like it is a two colour risograph print?',
}

// ─── The models ─────────────────────────────────────────────────────────────

async function paint(photo: Buffer, medium: Medium): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set.')
  const form = new FormData()
  form.append('model', 'gpt-image-1.5')
  form.append('image', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'photo.jpg')
  form.append('prompt', PROMPTS[medium])
  form.append('size', 'auto')
  form.append('n', '1')
  // NO quality setting, on purpose (Emerald, Nov 20: "implement the fast
  // version"). Side-by-side on her dog AND a family photo, the default came
  // back as bold as the "high" renders (the watercolour arguably bolder),
  // in 17-21s instead of 40-60s, at a third of the cost. The old "muddy
  // without quality high" finding belonged to chatgpt-image-latest, not to
  // this model. Sheets from the bake-off: scratchpad judge-dog/judge-family.
  //
  // Fidelity high is what stops it redrawing her face. Non-negotiable.
  form.append('input_fidelity', 'high')
  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form,
  })
  const j: any = await r.json().catch(() => null)
  const b64 = j?.data?.[0]?.b64_json
  if (!b64) throw new Error(`No image came back (${r.status}): ${String(j?.error?.message ?? '').slice(0, 120)}`)
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

  const [ga, gb] = await Promise.all([grey(photo), grey(painted)])

  // Match on EDGES, not brightness. A pen-and-ink drawing is black lines on
  // white paper, so its brightness map looks nothing like the photo and the
  // old brightness match happily chose a wrong zoom — her two-dogs-at-53%
  // screenshot (Emerald, Nov 20). Edges exist in both pictures in the same
  // places, whatever the medium. Oil and watercolour were already fine and
  // stay fine; ink is why this exists. Each map is standardised so the two
  // mediums' very different edge strengths cannot bias the comparison.
  const edges = (img: Buffer) => {
    const e = new Float32Array(N * N)
    let sum = 0, sumSq = 0
    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x
        const v = Math.abs(img[i + 1] - img[i - 1]) + Math.abs(img[i + N] - img[i - N])
        e[i] = v; sum += v; sumSq += v * v
      }
    }
    const n = (N - 2) * (N - 2)
    const mean = sum / n
    const sd = Math.sqrt(Math.max(1e-6, sumSq / n - mean * mean))
    for (let i = 0; i < e.length; i++) e[i] = (e[i] - mean) / sd
    return e
  }
  const a = edges(ga)
  const b = edges(gb)

  const sample = (img: Float32Array, x: number, y: number) => {
    const xi = x < 0 ? 0 : x > N - 1 ? N - 1 : x | 0
    const yi = y < 0 ? 0 : y > N - 1 ? N - 1 : y | 0
    return img[yi * N + xi]
  }

  // Slightly wider net than before: the ink drift that slipped through was
  // sitting just past the old search's fence.
  let best = { score: Infinity, scale: 1, dx: 0, dy: 0 }
  for (let s = 0.9; s <= 1.125; s += 0.01) {
    for (let dx = -10; dx <= 10; dx += 1) {
      for (let dy = -10; dy <= 10; dy += 1) {
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
  // Work at the LARGER of the two sizes. Registering down to the photo's
  // pixel size sanded the brushwork straight off (Emerald, Nov 19): the
  // painting's own resolution is where its texture lives.
  //
  // NO PADDING, EVER. The first version padded the painting by smearing its
  // edge pixels outward so the box could land partly outside, and whenever
  // the scale ran above 1 those smears were kept in the final picture — her
  // "weird striations around the edge" (Emerald, Nov 20, build 66 feedback).
  // Now only REAL painting pixels are used, and any sliver at the edge the
  // painting cannot reach is backfilled with the photo itself, which blends
  // invisibly at every slider position.
  const pMeta = await sharp(photo).metadata()
  const aMeta = await sharp(painted).metadata()
  const pw = pMeta.width ?? 1024
  const ph = pMeta.height ?? 1024
  const scaleUp = Math.max(1, (aMeta.width ?? pw) / pw)
  const W = Math.round(pw * scaleUp)
  const H = Math.round(ph * scaleUp)
  // The search ran on N×N squished thumbnails, so a horizontal step is W/N
  // real pixels but a vertical step is H/N. (The old code used W/N for both,
  // which quietly under-corrected vertical drift on portrait photos.)
  const s = best.scale
  const ox = best.dx * (W / N)
  const oy = best.dy * (H / N)
  const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

  const paintFull = await sharp(painted).resize(W, H, { fit: 'fill' }).toBuffer()

  // Where in the OUTPUT the real painting can supply pixels.
  const x0 = clamp(Math.ceil((0 - W / 2 - ox) / s + W / 2), 0, W - 8)
  const x1 = clamp(Math.floor((W - W / 2 - ox) / s + W / 2), x0 + 8, W)
  const y0 = clamp(Math.ceil((0 - H / 2 - oy) / s + H / 2), 0, H - 8)
  const y1 = clamp(Math.floor((H - H / 2 - oy) / s + H / 2), y0 + 8, H)
  const outW = x1 - x0
  const outH = y1 - y0

  // The painting region that maps onto that rectangle.
  const px = clamp(Math.round((x0 - W / 2) * s + W / 2 + ox), 0, W - 8)
  const py = clamp(Math.round((y0 - H / 2) * s + H / 2 + oy), 0, H - 8)
  const rw = clamp(Math.round(outW * s), 8, W - px)
  const rh = clamp(Math.round(outH * s), 8, H - py)

  const region = await sharp(paintFull)
    .extract({ left: px, top: py, width: rw, height: rh })
    .resize(outW, outH, { fit: 'fill' })
    .toBuffer()

  // Feather the painting into the photo wherever a sliver was trimmed, so
  // the hand-off is a soft fade rather than a visible straight seam. Sides
  // that reach the true edge of the frame stay crisp.
  const F = Math.max(12, Math.round(W * 0.015))
  const alpha = Buffer.alloc(outW * outH, 255)
  const fadeL = x0 > 0, fadeR = x1 < W, fadeT = y0 > 0, fadeB = y1 < H
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      let a = 1
      if (fadeL && x < F) a = Math.min(a, x / F)
      if (fadeR && outW - 1 - x < F) a = Math.min(a, (outW - 1 - x) / F)
      if (fadeT && y < F) a = Math.min(a, y / F)
      if (fadeB && outH - 1 - y < F) a = Math.min(a, (outH - 1 - y) / F)
      if (a < 1) alpha[y * outW + x] = Math.round(a * 255)
    }
  }
  const feathered = await sharp(region)
    .removeAlpha()
    .joinChannel(alpha, { raw: { width: outW, height: outH, channels: 1 } })
    .png()
    .toBuffer()

  return sharp(photo)
    .resize(W, H, { fit: 'fill' })
    .composite([{ input: feathered, left: x0, top: y0 }])
    .png()
    .toBuffer()
}

// ─── The job ────────────────────────────────────────────────────────────────

export async function paintUpload(uploadId: string, medium: Medium, userId: string): Promise<{ id: string; url: string }> {
  const original = await prisma.upload.findUnique({ where: { id: uploadId } })
  if (!original) throw new Error('That photo is no longer here.')
  if (!original.mime.startsWith('image/')) throw new Error('That is not a photo.')

  const sharp = (await import('sharp')).default
  const photo = Buffer.from(original.data)

  // Send the model a sensibly sized photo. It paints at about 1024 whatever
  // we give it, so posting a 2600px base64 only makes the request slow (the
  // oil timed out at 41 seconds doing exactly this) and costs more.
  const forModel = await sharp(photo)
    .resize(SEND_PX, SEND_PX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer()

  const raw = await paint(forModel, medium)

  const registered = await registerToPhoto(raw, photo)

  // JPEG, not PNG, and capped. The first version stored a 12MB PNG per
  // painting: slow to send to the phone and the likely cause of the oil
  // failing with a network error. 2048 still clears the 1875px a 6x4 card
  // needs for 300dpi, and the model never had more detail than that anyway.
  const stored = await sharp(registered)
    .resize(MAX_STORED_PX, MAX_STORED_PX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer()

  const saved = await prisma.upload.create({
    data: { userId, mime: 'image/jpeg', data: stored },
    select: { id: true },
  })
  const base = process.env.WEB_URL ?? 'https://qutenote.com'
  return { id: saved.id, url: `${base}/api/uploads/${saved.id}` }
}
