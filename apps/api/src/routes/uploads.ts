import { Router, Request, Response } from 'express'
import express from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { paintUpload, MEDIA, MEDIUM_LIMITS, type Medium } from '../lib/paintPhoto'

export const uploadsRouter = Router()

// Photos arrive as data URLs — bigger than the app-wide 1mb JSON cap.
// Raised to 16mb alongside the 2600px/q0.92 print-resolution photos (Nov 9):
// base64 inflates by a third, so a detail-heavy 4mb JPEG arrives as ~5.4mb.
const bigJson = express.json({ limit: '16mb' })

// POST /uploads — store a postcard photo or voice note, return its permanent URL
uploadsRouter.post('/', bigJson, requireAuth, async (req: AuthRequest, res: Response) => {
  const dataUrl: unknown = req.body?.dataUrl
  if (typeof dataUrl !== 'string') return res.status(400).json({ error: 'No image received.' })
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp)|audio\/(?:mp4|webm|mpeg|wav|aac|ogg|x-m4a));base64,([A-Za-z0-9+/=]+)$/)
  if (!m) return res.status(400).json({ error: "That doesn't look like a photo or a voice note." })
  const buf = Buffer.from(m[2], 'base64')
  if (buf.length > 10 * 1024 * 1024) return res.status(400).json({ error: m[1].startsWith('audio/') ? 'Voice note is too large.' : 'Photo is too large.' })

  const upload = await prisma.upload.create({
    data: { userId: req.userId!, mime: m[1], data: buf },
    select: { id: true },
  })
  const base = process.env.WEB_URL ?? 'https://qutenote.com'
  return res.status(201).json({ data: { id: upload.id, url: `${base}/api/uploads/${upload.id}` } })
})

// GET /uploads/:id — public (the print service fetches postcard fronts here)
// POST /uploads/:id/paint — repaint a photo in one of the five media.
//
// Each render costs real money (about 4c on Google, 8c on OpenAI for the
// risograph), so there is a hard daily cap per person. Without one, a stuck
// retry loop on somebody's phone could run up a bill overnight with nobody
// watching. The cap is deliberately generous for a human and tight for a bug.
const PAINTS_PER_DAY = 25

uploadsRouter.post('/:id/paint', requireAuth, async (req: AuthRequest, res: Response) => {
  const medium = String(req.body?.medium ?? '') as Medium
  if (!MEDIA.includes(medium)) {
    return res.status(400).json({ error: 'Pick one of the painting styles.' })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const usedToday = await prisma.upload.count({
    where: { userId: req.userId!, mime: 'image/png', createdAt: { gte: since } },
  })
  if (usedToday >= PAINTS_PER_DAY) {
    return res.status(429).json({ error: "You've made a lot of paintings today. Try again tomorrow." })
  }

  // The photo must be the person's own.
  const own = await prisma.upload.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true },
  })
  if (!own) return res.status(404).json({ error: 'That photo is no longer here.' })

  try {
    const painted = await paintUpload(req.params.id, medium, req.userId!)
    return res.json({ data: { ...painted, medium, ...MEDIUM_LIMITS[medium] } })
  } catch (err: any) {
    console.error('[paint]', medium, err?.message ?? err)
    return res.status(502).json({ error: "The painting didn't come back. Try again in a moment." })
  }
})

uploadsRouter.get('/:id', async (req: Request, res: Response) => {
  const upload = await prisma.upload.findUnique({ where: { id: req.params.id } })
  if (!upload) return res.status(404).json({ error: 'Not found.' })
  // The app is NOT on this origin: the TestFlight build runs from
  // capacitor://localhost and Qute Dev from the mini's LAN address, so the
  // security default of "same-origin only" made every uploaded photo render
  // as a broken thumbnail and every voice note refuse to play (Emerald,
  // Oct 25 — "upload a photo preview still not working"). These bytes are
  // public on purpose; the print service fetches them too.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', upload.mime)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  return res.send(Buffer.from(upload.data))
})
