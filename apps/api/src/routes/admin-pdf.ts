import { Router } from 'express'
import type { Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import type { AuthRequest } from '../middleware/auth'
import { verifyToken } from '../lib/jwt'
import PDFDocument from 'pdfkit'

export const adminPdfRouter = Router()

// Allow token via query param (for window.open PDF downloads) or Authorization header
async function requireAdminOrQuery(req: AuthRequest, res: Response, next: NextFunction) {
  const tokenFromQuery = req.query.token as string | undefined
  const authHeader = req.headers.authorization
  const token = tokenFromQuery ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)

  if (!token) return res.status(401).json({ error: 'Not logged in.' })

  try {
    const { userId } = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isAdmin: true } })
    if (!user) return res.status(401).json({ error: 'Account not found.' })
    if (!user.isAdmin) return res.status(403).json({ error: 'Not authorized.' })
    req.userId = userId
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
}

adminPdfRouter.use(requireAdminOrQuery)

// 6x9 postcard in points (72 points per inch)
const WIDTH = 6 * 72   // 432
const HEIGHT = 4 * 72   // 288 (standard 6x4 postcard)

// Closest built-in PDF stand-ins for the Oct 2026 pens. Real pen fonts on
// the printed card (including the person's own handwriting font) are a
// known follow-up — Emerald prints at home for now.
const FONT_MAP: Record<string, string> = {
  YOUR_HANDWRITING: 'Helvetica-Oblique',
  FRAUNCES: 'Times-Italic',
  SORA: 'Helvetica',
  DM_MONO: 'Courier',
  ROCK_SALT: 'Helvetica-Oblique',
}

// GET /admin/notes/:id/pdf — generate a printable postcard PDF
adminPdfRouter.get('/notes/:id/pdf', async (req: AuthRequest, res) => {
  const { id } = req.params

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      sender: { select: { displayName: true, username: true } },
      recipient: { select: { id: true, displayName: true, username: true } },
      cardDesign: true,
    },
  })

  if (!note) return res.status(404).json({ error: 'Note not found.' })

  // Get recipient address
  const address = await prisma.address.findUnique({
    where: { userId: note.recipientId },
  })

  const doc = new PDFDocument({
    size: [WIDTH, HEIGHT],
    margins: { top: 20, bottom: 20, left: 24, right: 24 },
    info: {
      Title: `QuteNote — ${note.sender.displayName} to ${note.recipient.displayName}`,
      Author: 'QuteNote',
    },
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="qutenote-${id.slice(0, 8)}.pdf"`)
  doc.pipe(res)

  // ─── PAGE 1: FRONT (card design) ───────────────────────────────────────────
  const imageUrl = note.cardImageUrl ?? note.cardDesign?.imageUrl

  // Background
  doc.rect(0, 0, WIDTH, HEIGHT).fill('#FAF7F2')

  if (imageUrl) {
    try {
      const response = await fetch(imageUrl)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      doc.image(buffer, 0, 0, { width: WIDTH, height: HEIGHT, cover: [WIDTH, HEIGHT] as any })
    } catch {
      // If image fails, show placeholder
      doc.rect(0, 0, WIDTH, HEIGHT).fill('#EDE8F7')
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#4A3B6B')
      doc.text('QuteNote', 0, HEIGHT / 2 - 30, { align: 'center', width: WIDTH })
      doc.fontSize(14).font('Helvetica').fillColor('#7B6DAF')
      doc.text(note.occasionType.replace('_', ' '), 0, HEIGHT / 2 + 10, { align: 'center', width: WIDTH })
    }
  } else {
    doc.rect(0, 0, WIDTH, HEIGHT).fill('#EDE8F7')
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#4A3B6B')
    doc.text('QuteNote', 0, HEIGHT / 2 - 30, { align: 'center', width: WIDTH })
    doc.fontSize(14).font('Helvetica').fillColor('#7B6DAF')
    doc.text(note.occasionType.replace('_', ' '), 0, HEIGHT / 2 + 10, { align: 'center', width: WIDTH })
  }

  // ─── PAGE 2: BACK (note text + address) ────────────────────────────────────
  doc.addPage({ size: [WIDTH, HEIGHT], margins: { top: 20, bottom: 20, left: 24, right: 24 } })

  // Background — parchment with ruled lines
  doc.rect(0, 0, WIDTH, HEIGHT).fill('#F3EDE3')
  doc.strokeColor('#D8CEEA').lineWidth(0.5)
  for (let y = 40; y < HEIGHT - 20; y += 22) {
    doc.moveTo(20, y).lineTo(WIDTH - 20, y).stroke()
  }

  // Vertical divider down the middle
  const midX = WIDTH / 2
  doc.strokeColor('#F0B8C0').lineWidth(0.8)
  doc.moveTo(midX, 20).lineTo(midX, HEIGHT - 20).stroke()

  // LEFT SIDE: note text
  const noteFont = FONT_MAP[note.fontChoice] ?? 'Helvetica'
  doc.font(noteFont).fontSize(11).fillColor('#2E2440')
  doc.text(note.noteText, 28, 46, {
    width: midX - 56,
    lineGap: 10.5,
  })

  // Sender sign-off at bottom left
  doc.fontSize(9).fillColor('#5C5070')
  doc.text(`— ${note.sender.displayName}`, 28, HEIGHT - 40, { width: midX - 56 })

  // RIGHT SIDE: stamp area + address
  // Stamp placeholder
  doc.rect(WIDTH - 64, 24, 40, 48).lineWidth(1).strokeColor('#9B8EC4').stroke()
  doc.rect(WIDTH - 64, 24, 40, 48).fill('#EDE8F7')
  doc.fontSize(16).fillColor('#9B8EC4')
  doc.text('♥', WIDTH - 58, 36, { width: 28, align: 'center' })

  // "QuteNote" small branding top-right
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#9B8EC4')
  doc.text('QuteNote', midX + 12, 28)

  // Recipient address
  if (address) {
    const addrY = HEIGHT / 2 - 20
    doc.font('Helvetica').fontSize(11).fillColor('#2E2440')
    doc.text(note.recipient.displayName, midX + 16, addrY, { width: WIDTH / 2 - 40 })
    doc.text(address.encryptedLine1, midX + 16, addrY + 16, { width: WIDTH / 2 - 40 })
    if (address.encryptedLine2) {
      doc.text(address.encryptedLine2, midX + 16, addrY + 32, { width: WIDTH / 2 - 40 })
    }
    const cityLine = `${address.encryptedCity}, ${address.encryptedState} ${address.encryptedZip}`
    const cityY = address.encryptedLine2 ? addrY + 48 : addrY + 32
    doc.text(cityLine, midX + 16, cityY, { width: WIDTH / 2 - 40 })
  } else {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#9B92AD')
    doc.text('No address on file', midX + 16, HEIGHT / 2 - 10, { width: WIDTH / 2 - 40 })
  }

  // Address lines (decorative)
  const lineStartX = midX + 16
  const lineEndX = WIDTH - 32
  for (let i = 0; i < 3; i++) {
    const ly = HEIGHT / 2 + 50 + i * 20
    doc.strokeColor('#D8CEEA').lineWidth(0.5)
    doc.moveTo(lineStartX, ly).lineTo(lineEndX, ly).stroke()
  }

  doc.end()
})
