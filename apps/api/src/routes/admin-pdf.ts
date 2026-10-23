import { Router } from 'express'
import type { Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import type { AuthRequest } from '../middleware/auth'
import { verifyToken } from '../lib/jwt'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import { encodeSecret } from '../lib/secret'
import { drawFlowerText, hasFlowerAssets } from '../lib/flower'

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

// The built-in PDF fonts have no ♥ glyph (it printed as "&e"), so hearts are
// drawn as a real vector path. (cx, cy) is the heart's center, h its height.
function drawHeart(doc: PDFKit.PDFDocument, cx: number, cy: number, h: number, color: string) {
  const s = h / 16
  doc.save().translate(cx - 9 * s, cy - 7.5 * s).scale(s)
  doc.path('M9 16c-6-4-9-7.5-9-11C0 2.5 2 .5 4.5.5 6.3.5 7.8 1.5 9 3c1.2-1.5 2.7-2.5 4.5-2.5C16 .5 18 2.5 18 5c0 3.5-3 7-9 11z').fill(color)
  doc.restore()
}

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

// Emerald's cipher font, shipped with the API so printed secret cards render
// the real symbols. assets/ sits next to src/ and dist/, so resolve from cwd.
const SECRET_FONT_PATH = path.join(process.cwd(), 'assets', 'QuteNoteSecret.otf')
const hasSecretFont = fs.existsSync(SECRET_FONT_PATH)

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
  doc.rect(0, 0, WIDTH, HEIGHT).fill('#F1EBE3')

  if (imageUrl) {
    try {
      const response = await fetch(imageUrl)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      doc.image(buffer, 0, 0, { width: WIDTH, height: HEIGHT, cover: [WIDTH, HEIGHT] as any })
    } catch {
      // If image fails, show placeholder
      doc.rect(0, 0, WIDTH, HEIGHT).fill('#F4ECE6')
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#4A2424')
      doc.text('QuteNote', 0, HEIGHT / 2 - 30, { align: 'center', width: WIDTH })
      doc.fontSize(14).font('Helvetica').fillColor('#A07D7D')
      doc.text(note.occasionType.replace('_', ' '), 0, HEIGHT / 2 + 10, { align: 'center', width: WIDTH })
    }
  } else {
    doc.rect(0, 0, WIDTH, HEIGHT).fill('#F4ECE6')
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#4A2424')
    doc.text('QuteNote', 0, HEIGHT / 2 - 30, { align: 'center', width: WIDTH })
    doc.fontSize(14).font('Helvetica').fillColor('#A07D7D')
    doc.text(note.occasionType.replace('_', ' '), 0, HEIGHT / 2 + 10, { align: 'center', width: WIDTH })
  }

  // ─── PAGE 2: BACK (note text + address) ────────────────────────────────────
  doc.addPage({ size: [WIDTH, HEIGHT], margins: { top: 20, bottom: 20, left: 24, right: 24 } })

  // Background — parchment with ruled lines
  doc.rect(0, 0, WIDTH, HEIGHT).fill('#F1EBE3')
  doc.strokeColor('#C4A396').lineWidth(0.5)
  for (let y = 40; y < HEIGHT - 20; y += 22) {
    doc.moveTo(20, y).lineTo(WIDTH - 20, y).stroke()
  }

  // Vertical divider down the middle
  const midX = WIDTH / 2
  doc.strokeColor('#D5ADA3').lineWidth(0.8)
  doc.moveTo(midX, 20).lineTo(midX, HEIGHT - 20).stroke()

  // LEFT SIDE: note text. Secret-pen cards print the cipher itself — the
  // recipient decodes with the in-app key. Fall back to italic plain text
  // only if the font file is somehow missing.
  const isSecret = (note.fontChoice as string) === 'SECRET'
  const isFlower = (note.fontChoice as string) === 'FLOWER'
  if (isFlower && hasFlowerAssets()) {
    // Flower Language: the printed card IS the bouquet arrangement.
    drawFlowerText(doc, note.noteText, 28, 46, midX - 56, 46)
  } else if (isSecret && hasSecretFont) {
    doc.registerFont('QuteNoteSecret', SECRET_FONT_PATH)
    doc.font('QuteNoteSecret').fontSize(13).fillColor('#4A2424')
    doc.text(encodeSecret(note.noteText), 28, 46, {
      width: midX - 56,
      lineGap: 12,
    })
  } else {
    const noteFont = isSecret || isFlower ? 'Helvetica-Oblique' : (FONT_MAP[note.fontChoice] ?? 'Helvetica')
    doc.font(noteFont).fontSize(11).fillColor('#4A2424')
    doc.text(note.noteText, 28, 46, {
      width: midX - 56,
      lineGap: 10.5,
    })
  }

  // Sender sign-off at bottom left
  doc.fontSize(9).fillColor('#A07D7D')
  doc.text(`— ${note.sender.displayName}`, 28, HEIGHT - 40, { width: midX - 56 })

  // RIGHT SIDE: stamp area + address
  // Stamp placeholder
  doc.rect(WIDTH - 64, 24, 40, 48).lineWidth(1).strokeColor('#B4897A').stroke()
  doc.rect(WIDTH - 64, 24, 40, 48).fill('#F4ECE6')
  drawHeart(doc, WIDTH - 44, 48, 18, '#EEFC4E')

  // "QuteNote" small branding top-right
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#B4897A')
  doc.text('QuteNote', midX + 12, 28)

  // Recipient address
  if (address) {
    const addrY = HEIGHT / 2 - 20
    doc.font('Helvetica').fontSize(11).fillColor('#4A2424')
    doc.text(note.recipient.displayName, midX + 16, addrY, { width: WIDTH / 2 - 40 })
    doc.text(address.encryptedLine1, midX + 16, addrY + 16, { width: WIDTH / 2 - 40 })
    if (address.encryptedLine2) {
      doc.text(address.encryptedLine2, midX + 16, addrY + 32, { width: WIDTH / 2 - 40 })
    }
    const cityLine = `${address.encryptedCity}, ${address.encryptedState} ${address.encryptedZip}`
    const cityY = address.encryptedLine2 ? addrY + 48 : addrY + 32
    doc.text(cityLine, midX + 16, cityY, { width: WIDTH / 2 - 40 })
  } else {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#A07D7D')
    doc.text('No address on file', midX + 16, HEIGHT / 2 - 10, { width: WIDTH / 2 - 40 })
  }

  // Address lines (decorative)
  const lineStartX = midX + 16
  const lineEndX = WIDTH - 32
  for (let i = 0; i < 3; i++) {
    const ly = HEIGHT / 2 + 50 + i * 20
    doc.strokeColor('#C4A396').lineWidth(0.5)
    doc.moveTo(lineStartX, ly).lineTo(lineEndX, ly).stroke()
  }

  // Bottom-right QR — scanning opens the card in the app (reply, decode,
  // voice note). Printed on its own light patch so the ruled lines don't
  // bleed into the code.
  if (note.scanCode) {
    const QR_SIZE = 44
    const qrX = WIDTH - 24 - QR_SIZE
    const qrY = HEIGHT - 20 - QR_SIZE
    const qrPng = await QRCode.toBuffer(`https://qutenote.com/c/${note.scanCode}`, {
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 220,
      color: { dark: '#4A2424', light: '#F1EBE3' },
    })
    doc.rect(qrX - 4, qrY - 16, QR_SIZE + 8, QR_SIZE + 20).fill('#F1EBE3')
    doc.image(qrPng, qrX, qrY, { width: QR_SIZE, height: QR_SIZE })
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#B4897A')
    const caption = 'Scan me'
    const capW = doc.widthOfString(caption) + 9
    const capX = qrX + QR_SIZE / 2 - capW / 2
    doc.text(caption, capX, qrY - 13, { lineBreak: false })
    drawHeart(doc, capX + capW - 3.5, qrY - 10, 7, '#9E625F')
  }

  doc.end()
})
