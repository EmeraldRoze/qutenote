import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyUser } from '../lib/notify'

export const statusesRouter = Router()
statusesRouter.use(requireAuth)

const statusSchema = z.object({
  emoji: z.string().max(40).optional(),
  text: z.string().min(1, 'Say a little something.').max(60, 'Keep it under 60 characters.'),
})

// POST /statuses — share what's new with you
statusesRouter.post('/', async (req: AuthRequest, res: Response) => {
  const result = statusSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message })
  }
  const status = await prisma.status.create({
    data: { userId: req.userId!, emoji: result.data.emoji ?? null, text: result.data.text },
    select: { id: true, emoji: true, text: true, createdAt: true },
  })

  const poster = await prisma.user.findUnique({ where: { id: req.userId! }, select: { displayName: true } })
  const followers = await prisma.connection.findMany({
    where: { followingId: req.userId!, status: 'ACCEPTED' },
    select: { followerId: true },
  })
  await Promise.all(
    followers.map((f) =>
      notifyUser(f.followerId, 'friendStatusUpdate', `${poster?.displayName}`, result.data.text),
    ),
  )

  return res.status(201).json({ data: status })
})

// GET /statuses/mine — my latest status (for the Happenings row)
statusesRouter.get('/mine', async (req: AuthRequest, res: Response) => {
  const status = await prisma.status.findFirst({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    select: { id: true, emoji: true, text: true, createdAt: true },
  })
  return res.json({ data: status })
})

// GET /statuses/home-feed — statuses and public sends from my people, merged
statusesRouter.get('/home-feed', async (req: AuthRequest, res: Response) => {
  const following = await prisma.connection.findMany({
    where: { followerId: req.userId!, status: 'ACCEPTED' },
    select: { followingId: true },
  })
  const ids = following.map((c) => c.followingId)

  const userSelect = { id: true, username: true, displayName: true, avatarUrl: true }

  const [statuses, notes] = await Promise.all([
    // Only the CURRENT status per person. Every save writes a new row, so
    // without this one chatty friend filled the whole feed with their own
    // history (Emerald, Oct 25: "why is his status showing so many times").
    prisma.status.findMany({
      where: { userId: { in: ids } },
      select: { id: true, emoji: true, text: true, createdAt: true, userId: true, user: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
      take: 120,
    }),
    prisma.note.findMany({
      where: { senderId: { in: [...ids, req.userId!] }, status: { in: ['SENT', 'PRINTED'] } },
      select: {
        id: true, occasionType: true, createdAt: true,
        sender: { select: userSelect }, recipient: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const seenUser = new Set<string>()
  const latestStatuses = statuses.filter((s) => {
    if (seenUser.has(s.userId)) return false
    seenUser.add(s.userId)
    return true
  })

  const items = [
    ...latestStatuses.map((s) => ({
      kind: 'status' as const,
      id: s.id, emoji: s.emoji, text: s.text, createdAt: s.createdAt, user: s.user,
    })),
    ...notes.map((n) => ({
      kind: 'note' as const,
      id: n.id, occasionType: n.occasionType, createdAt: n.createdAt,
      sender: n.sender, recipient: n.recipient,
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 25)

  // Heart counts and whether I hearted each item
  const keys = items.map((i) => ({ targetType: i.kind === 'status' ? 'STATUS' : 'NOTE', targetId: i.id }))
  const hearts = keys.length
    ? await prisma.heart.groupBy({
        by: ['targetType', 'targetId'],
        where: { OR: keys },
        _count: { _all: true },
      })
    : []
  const mine = keys.length
    ? await prisma.heart.findMany({
        where: { userId: req.userId!, OR: keys },
        select: { targetType: true, targetId: true },
      })
    : []
  const countOf = new Map(hearts.map((h) => [`${h.targetType}:${h.targetId}`, h._count._all]))
  const mineSet = new Set(mine.map((h) => `${h.targetType}:${h.targetId}`))

  return res.json({
    data: items.map((i) => {
      const key = `${i.kind === 'status' ? 'STATUS' : 'NOTE'}:${i.id}`
      return { ...i, hearts: countOf.get(key) ?? 0, heartedByMe: mineSet.has(key) }
    }),
  })
})

// POST /statuses/heart — toggle a heart on a feed item
statusesRouter.post('/heart', async (req: AuthRequest, res: Response) => {
  const { targetType, targetId } = req.body ?? {}
  if (!['NOTE', 'STATUS'].includes(targetType) || typeof targetId !== 'string') {
    return res.status(400).json({ error: 'Invalid heart target.' })
  }
  const existing = await prisma.heart.findUnique({
    where: { userId_targetType_targetId: { userId: req.userId!, targetType, targetId } },
  })
  if (existing) {
    await prisma.heart.delete({ where: { id: existing.id } })
    return res.json({ data: { hearted: false } })
  }
  await prisma.heart.create({ data: { userId: req.userId!, targetType, targetId } })
  return res.json({ data: { hearted: true } })
})
