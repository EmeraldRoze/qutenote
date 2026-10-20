import { Router, Response } from 'express'
import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const handwritingRouter = Router()
const bigJson = express.json({ limit: '4mb' })
handwritingRouter.use(bigJson, requireAuth)

// GET /handwriting — current progress + whether a font exists yet
handwritingRouter.get('/', async (req: AuthRequest, res: Response) => {
  const row = await prisma.handwritingFont.findUnique({
    where: { userId: req.userId! },
    select: { glyphs: true, fontData: true, updatedAt: true },
  })
  return res.json({
    data: {
      glyphs: row?.glyphs ?? {},
      hasFont: !!row?.fontData,
      updatedAt: row?.updatedAt ?? null,
    },
  })
})

// GET /handwriting/font — the compiled font file itself (own font only, for now)
handwritingRouter.get('/font', async (req: AuthRequest, res: Response) => {
  const row = await prisma.handwritingFont.findUnique({
    where: { userId: req.userId! },
    select: { fontData: true },
  })
  if (!row?.fontData) return res.status(404).json({ error: 'No handwriting font yet.' })
  res.setHeader('Content-Type', 'font/ttf')
  res.setHeader('Cache-Control', 'private, no-cache') // it changes as they write more letters
  return res.send(Buffer.from(row.fontData))
})

const glyphStrokesSchema = z.record(
  z.string(),
  z.array(z.array(z.object({ x: z.number(), y: z.number() }))),
)
const saveSchema = z.object({
  glyphs: glyphStrokesSchema, // the full merged set, compiled client-side
  fontData: z.string(), // base64-encoded TTF
})

// PUT /handwriting — save the merged glyph strokes + the freshly compiled font
handwritingRouter.put('/', async (req: AuthRequest, res: Response) => {
  const result = saveSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message })
  }
  const { glyphs, fontData } = result.data
  // 67 characters x up to 3 takes each (primary + two alternates), plus a
  // little slack. The old cap of 100 rejected saves the moment variations
  // filled up (Emerald's "not working, I'm on WiFi" — build 45).
  if (Object.keys(glyphs).length > 220) {
    return res.status(400).json({ error: 'That is more characters than we ask for.' })
  }
  let buf: Buffer
  try {
    buf = Buffer.from(fontData, 'base64')
  } catch {
    return res.status(400).json({ error: "That font didn't come through right." })
  }
  if (buf.length > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'That font file is too large.' })
  }

  await prisma.handwritingFont.upsert({
    where: { userId: req.userId! },
    create: { userId: req.userId!, glyphs, fontData: buf },
    update: { glyphs, fontData: buf },
  })
  return res.status(200).json({ data: { saved: true } })
})
