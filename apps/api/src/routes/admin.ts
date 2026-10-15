import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'

export const adminRouter = Router()
adminRouter.use(requireAdmin)

// GET /admin/early-access — the launch list (pre-launch email collection)
adminRouter.get('/early-access', async (_req: AuthRequest, res) => {
  const rows = await prisma.earlySignup.findMany({ orderBy: { createdAt: 'desc' } })
  return res.json({ data: rows })
})

// GET /admin/notes — all notes with sender/recipient info, newest first
adminRouter.get('/notes', async (_req: AuthRequest, res) => {
  const notes = await prisma.note.findMany({
    include: {
      sender: { select: { id: true, displayName: true, username: true } },
      recipient: { select: { id: true, displayName: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return res.json({ data: notes })
})

// PATCH /admin/notes/:id/status — update note status (PRINTED or SENT)
adminRouter.patch('/notes/:id/status', async (req: AuthRequest, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!status || !['PRINTED', 'SENT', 'FAILED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be PRINTED, SENT, or FAILED.' })
  }

  const note = await prisma.note.findUnique({ where: { id } })
  if (!note) return res.status(404).json({ error: 'Note not found.' })

  const updateData: any = { status }
  if (status === 'SENT') updateData.sentAt = new Date()

  const updated = await prisma.note.update({ where: { id }, data: updateData })

  // Create notification for the sender when note ships
  if (status === 'SENT') {
    const recipient = await prisma.user.findUnique({
      where: { id: note.recipientId },
      select: { displayName: true },
    })
    await prisma.notification.create({
      data: {
        userId: note.senderId,
        type: 'NOTE_SENT',
        title: 'Your note is on its way!',
        body: `Your note to ${recipient?.displayName ?? 'your friend'} has been printed and mailed. It should arrive in 3-5 business days.`,
      },
    })
  }

  return res.json({ data: updated })
})
