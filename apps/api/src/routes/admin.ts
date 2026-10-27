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

// ─── ARTIST PROGRAM REVIEW (Emerald, Oct 26) ─────────────────────────────────
// Every application and every card needs her yes. She asked for this in two
// places — here on the web and on an admin screen in the app — so both call
// these same endpoints.

// GET /admin/artists/applications?status=PENDING
adminRouter.get('/artists/applications', async (req: AuthRequest, res) => {
  const status = String(req.query.status ?? 'PENDING').toUpperCase()
  const rows = await prisma.artistProfile.findMany({
    where: status === 'ALL' ? {} : { status: status as any },
    include: {
      user: { select: { id: true, username: true, displayName: true, email: true } },
      cards: { select: { id: true, title: true, uploadId: true, status: true } },
    },
    orderBy: { appliedAt: 'desc' },
    take: 100,
  })
  return res.json({ data: rows })
})

// POST /admin/artists/:id/decision  { approve: true|false, note?: string }
adminRouter.post('/artists/:id/decision', async (req: AuthRequest, res) => {
  const approve = req.body?.approve === true

  // The ID photo exists only for this moment. Once she has decided, the
  // image is deleted and the link cleared (Emerald, Oct 26).
  const before = await prisma.artistProfile.findUnique({ where: { id: String(req.params.id) }, select: { idUploadId: true } })
  if (before?.idUploadId) {
    const uploadId = before.idUploadId.split('/').pop() ?? ''
    await prisma.upload.delete({ where: { id: uploadId } }).catch(() => {})
  }

  const profile = await prisma.artistProfile.update({
    where: { id: String(req.params.id) },
    data: {
      status: approve ? 'APPROVED' : 'DECLINED',
      reviewedAt: new Date(),
      reviewNote: typeof req.body?.note === 'string' ? req.body.note.slice(0, 300) : null,
      idUploadId: null,
    },
  })
  await prisma.notification.create({
    data: {
      userId: profile.userId,
      type: approve ? 'ARTIST_APPROVED' : 'ARTIST_APPLICATION',
      title: approve ? "You're a QuteNote artist" : 'About your artist application',
      body: approve
        ? 'Upload your three cards and we will get them in the shop.'
        : 'We are not able to take you on right now. You can apply again later.',
    },
  }).catch(() => {})
  return res.json({ data: profile })
})

// GET /admin/artists/cards?status=IN_REVIEW
adminRouter.get('/artists/cards', async (req: AuthRequest, res) => {
  const status = String(req.query.status ?? 'IN_REVIEW').toUpperCase()
  const rows = await prisma.artistCard.findMany({
    where: status === 'ALL' ? {} : { status: status as any },
    include: { artist: { include: { user: { select: { username: true, displayName: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return res.json({ data: rows })
})

// POST /admin/artists/cards/:id/decision  { approve: true|false }
adminRouter.post('/artists/cards/:id/decision', async (req: AuthRequest, res) => {
  const approve = req.body?.approve === true
  const card = await prisma.artistCard.update({
    where: { id: String(req.params.id) },
    data: { status: approve ? 'APPROVED' : 'REJECTED', reviewedAt: new Date() },
    include: { artist: true },
  })
  if (approve) {
    await prisma.notification.create({
      data: {
        userId: card.artist.userId,
        type: 'ARTIST_CARD_APPROVED',
        title: 'Your card is in the shop',
        body: `"${card.title}" is live and can be sent.`,
      },
    }).catch(() => {})
  }
  return res.json({ data: card })
})

// POST /admin/artists/featured  { month: "2026-11", artistIds: [...] }
// The five she features this month, in the order she lists them.
adminRouter.post('/artists/featured', async (req: AuthRequest, res) => {
  const month = String(req.body?.month ?? '').trim()
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Month looks like 2026-11.' })
  const ids: string[] = Array.isArray(req.body?.artistIds) ? req.body.artistIds.map(String).slice(0, 5) : []

  // clear this month, then set the new line-up in order
  await prisma.artistProfile.updateMany({ where: { featuredMonth: month }, data: { featuredMonth: null, featuredOrder: null } })
  for (let i = 0; i < ids.length; i++) {
    await prisma.artistProfile.update({ where: { id: ids[i] }, data: { featuredMonth: month, featuredOrder: i } })
  }
  return res.json({ data: { month, artistIds: ids } })
})

// GET /admin/artists/earnings — what she owes, grouped by artist
adminRouter.get('/artists/earnings', async (_req: AuthRequest, res) => {
  const rows = await prisma.artistEarning.groupBy({
    by: ['artistId'],
    where: { paidOutAt: null },
    _sum: { amountCents: true },
    _count: { id: true },
  })
  const artists = await prisma.artistProfile.findMany({
    where: { id: { in: rows.map((r) => r.artistId) } },
    select: { id: true, paypalEmail: true, city: true, user: { select: { username: true, displayName: true } } },
  })
  const byId = Object.fromEntries(artists.map((a) => [a.id, a]))
  return res.json({
    data: rows.map((r) => ({
      artist: byId[r.artistId],
      owedCents: r._sum.amountCents ?? 0,
      cardsSent: r._count.id,
    })),
  })
})

// POST /admin/artists/earnings/paid  { artistId }
// She pays by hand in PayPal, then marks it settled here.
adminRouter.post('/artists/earnings/paid', async (req: AuthRequest, res) => {
  const artistId = String(req.body?.artistId ?? '')
  const r = await prisma.artistEarning.updateMany({
    where: { artistId, paidOutAt: null },
    data: { paidOutAt: new Date() },
  })
  return res.json({ data: { settled: r.count } })
})

// GET /admin/artists/:id — one application, everything she needs to judge it
adminRouter.get('/artists/:id', async (req: AuthRequest, res) => {
  const profile = await prisma.artistProfile.findUnique({
    where: { id: String(req.params.id) },
    include: {
      user: { select: { id: true, username: true, displayName: true, email: true, createdAt: true } },
      cards: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!profile) return res.status(404).json({ error: 'No application by that id.' })

  const [sent, earned] = await Promise.all([
    prisma.artistCard.aggregate({ where: { artistId: profile.id }, _sum: { sentCount: true } }),
    prisma.artistEarning.aggregate({ where: { artistId: profile.id }, _sum: { amountCents: true } }),
  ])

  return res.json({
    data: { ...profile, cardsSent: sent._sum.sentCount ?? 0, earnedCents: earned._sum.amountCents ?? 0 },
  })
})
