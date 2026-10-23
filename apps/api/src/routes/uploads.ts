import { Router, Request, Response } from 'express'
import express from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const uploadsRouter = Router()

// Photos arrive as data URLs — bigger than the app-wide 1mb JSON cap.
const bigJson = express.json({ limit: '10mb' })

// POST /uploads — store a postcard photo or voice note, return its permanent URL
uploadsRouter.post('/', bigJson, requireAuth, async (req: AuthRequest, res: Response) => {
  const dataUrl: unknown = req.body?.dataUrl
  if (typeof dataUrl !== 'string') return res.status(400).json({ error: 'No image received.' })
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp)|audio\/(?:mp4|webm|mpeg|wav|aac|ogg|x-m4a));base64,([A-Za-z0-9+/=]+)$/)
  if (!m) return res.status(400).json({ error: "That doesn't look like a photo or a voice note." })
  const buf = Buffer.from(m[2], 'base64')
  if (buf.length > 7 * 1024 * 1024) return res.status(400).json({ error: m[1].startsWith('audio/') ? 'Voice note is too large.' : 'Photo is too large.' })

  const upload = await prisma.upload.create({
    data: { userId: req.userId!, mime: m[1], data: buf },
    select: { id: true },
  })
  const base = process.env.WEB_URL ?? 'https://qutenote.com'
  return res.status(201).json({ data: { id: upload.id, url: `${base}/api/uploads/${upload.id}` } })
})

// GET /uploads/:id — public (the print service fetches postcard fronts here)
uploadsRouter.get('/:id', async (req: Request, res: Response) => {
  const upload = await prisma.upload.findUnique({ where: { id: req.params.id } })
  if (!upload) return res.status(404).json({ error: 'Not found.' })
  res.setHeader('Content-Type', upload.mime)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  return res.send(Buffer.from(upload.data))
})
