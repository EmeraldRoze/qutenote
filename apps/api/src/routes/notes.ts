import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { EDIT_WINDOW_MS } from '../lib/submitNote'
import { notifyUser } from '../lib/notify'
// @ts-ignore — lob package has no types
import Lob from 'lob'

const lob = new Lob(process.env.LOB_API_KEY)

export const notesRouter = Router()

const createNoteSchema = z.object({
  recipientId: z.string().uuid(),
  occasionType: z.string(),
  noteText: z.string().min(5).max(450),
  toneUsed: z.string(),
  fontChoice: z.string(),
  cardDesignType: z.enum(['ARTIST', 'USER_UPLOAD']),
  cardDesignId: z.string().optional(),
  cardImageUrl: z.string().optional(),
})

// POST /notes — save a new note
notesRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createNoteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid note data. Please fill out all fields.' })
  }

  const {
    recipientId,
    occasionType,
    noteText,
    toneUsed,
    fontChoice,
    cardDesignType,
    cardDesignId,
    cardImageUrl,
  } = parsed.data

  // Make sure recipient exists
  const recipient = await prisma.user.findUnique({ where: { id: recipientId } })
  if (!recipient) {
    return res.status(404).json({ error: "We couldn't find that recipient." })
  }

  // Get sender info
  const sender = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!sender) return res.status(404).json({ error: 'Sender not found.' })

  // Free mode (Oct 2026): QuteNote is free right now — no subscription, no
  // charges anywhere. The monthly allowance still applies so sending stays
  // bounded; gifted invite credits extend it.
  const withinAllowance = sender.notesUsed < sender.notesAllowance
  const hasGiftedCredits = sender.giftedCredits > 0
  if (!withinAllowance && !hasGiftedCredits) {
    return res.status(403).json({ error: "You've sent all your cards for this month. More unlock on the 1st!" })
  }

  // Deduct from allowance first, then gifted credits
  if (withinAllowance) {
    await prisma.user.update({ where: { id: sender.id }, data: { notesUsed: { increment: 1 } } })
  } else {
    await prisma.user.update({ where: { id: sender.id }, data: { giftedCredits: { decrement: 1 } } })
  }

  // Get recipient address and check verification
  const recipientAddress = await prisma.address.findUnique({ where: { userId: recipientId } })
  if (!recipientAddress) {
    return res.status(400).json({ error: `${recipient.displayName} hasn't added their address yet. Ask them to add it first!` })
  }
  if (!recipientAddress.isVerified) {
    return res.status(400).json({ error: `${recipient.displayName}'s address couldn't be verified. Ask them to double-check it!` })
  }

  // Get sender address (for return address on postcard)
  const senderAddress = await prisma.address.findUnique({ where: { userId: req.userId! } })

  const note = await prisma.note.create({
    data: {
      senderId: req.userId!,
      recipientId,
      occasionType: occasionType as any,
      noteText,
      toneUsed: toneUsed as any,
      fontChoice: fontChoice as any,
      cardDesignType: cardDesignType as any,
      cardDesignId: cardDesignId ?? null,
      cardImageUrl: cardImageUrl ?? null,
      stripeChargeId: null,
      status: 'PENDING',
    },
  })

  // The note waits in PENDING for 2 hours — the sender can still edit it.
  // The scheduler submits it to Lob when the window closes.

  await notifyUser(
    recipientId,
    'friendSentCard',
    `${sender.displayName} sent you a card`,
    "It's on its way! Check QuteNote to see who it's from.",
  )

  return res.status(201).json({ data: note })
})

// PATCH /notes/:id — edit a note during its 2-hour window
const editSchema = z.object({
  noteText: z.string().min(5).max(450).optional(),
  fontChoice: z.string().optional(),
})
notesRouter.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const parsed = editSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid edit.' })
  const note = await prisma.note.findUnique({ where: { id: req.params.id } })
  if (!note || note.senderId !== req.userId) return res.status(404).json({ error: 'Note not found.' })
  if (note.status !== 'PENDING' || Date.now() - +note.createdAt > EDIT_WINDOW_MS) {
    return res.status(400).json({ error: 'This note already went to print.' })
  }
  const updated = await prisma.note.update({
    where: { id: note.id },
    data: {
      ...(parsed.data.noteText ? { noteText: parsed.data.noteText } : {}),
      ...(parsed.data.fontChoice ? { fontChoice: parsed.data.fontChoice as any } : {}),
    },
  })
  return res.json({ data: updated })
})

// GET /notes/sent — notes the current user sent
notesRouter.get('/sent', requireAuth, async (req: AuthRequest, res) => {
  const notes = await prisma.note.findMany({
    where: { senderId: req.userId! },
    include: { recipient: { select: { id: true, displayName: true, username: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return res.json({ data: notes })
})

// GET /notes/received — notes the current user received
notesRouter.get('/received', requireAuth, async (req: AuthRequest, res) => {
  const notes = await prisma.note.findMany({
    where: { recipientId: req.userId! },
    include: { sender: { select: { id: true, displayName: true, username: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return res.json({ data: notes })
})
