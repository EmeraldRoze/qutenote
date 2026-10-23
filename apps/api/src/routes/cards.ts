import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'

// Scanning the QR on a printed card opens it in the app: the card saves to
// the scanner's Received collection, with Reply / Decode / Listen on screen.
export const cardsRouter = Router()

// GET /cards/scan/:code — look up a card by its printed QR code
cardsRouter.get('/scan/:code', requireAuth, async (req: AuthRequest, res) => {
  const note = await prisma.note.findUnique({
    where: { scanCode: req.params.code },
    include: {
      sender: { select: { id: true, displayName: true, username: true } },
      cardDesign: true,
    },
  })
  if (!note) return res.status(404).json({ error: "Hmm, that code doesn't match any card." })

  // Whoever is holding the card keeps it — except the sender scanning their own
  if (note.senderId !== req.userId) {
    await prisma.receivedCard.upsert({
      where: { userId_noteId: { userId: req.userId!, noteId: note.id } },
      update: {},
      create: { userId: req.userId!, noteId: note.id },
    })
  }

  return res.json({
    data: {
      id: note.id,
      noteText: note.noteText,
      fontChoice: note.fontChoice,
      occasionType: note.occasionType,
      cardDesignId: note.cardDesignId,
      cardImageUrl: note.cardImageUrl ?? note.cardDesign?.imageUrl ?? null,
      voiceUploadId: note.voiceUploadId,
      createdAt: note.createdAt,
      sender: note.sender,
      isOwn: note.senderId === req.userId,
    },
  })
})
