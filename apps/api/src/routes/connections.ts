import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { pushToUserDevices } from '../lib/apns'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyUser } from '../lib/notify'

export const connectionsRouter = Router()
connectionsRouter.use(requireAuth)

// GET /connections
connectionsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const connections = await prisma.connection.findMany({
    where: { followerId: req.userId, status: 'ACCEPTED' },
    include: {
      following: {
        select: {
          id: true, username: true, displayName: true, avatarUrl: true, birthday: true,
          address: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = connections.map((c) => ({
    id: c.following.id,
    username: c.following.username,
    displayName: c.following.displayName,
    avatarUrl: c.following.avatarUrl,
    hasAddress: !!c.following.address,
    connectedAt: c.createdAt,
    // Day and month only — the QTs list counts down to their birthday and the
    // year is nobody's business (Emerald, Oct 24: the countdown went missing
    // for QTs whose birthday lives on their profile, not in Important dates).
    birthdayMonth: c.following.birthday ? c.following.birthday.getUTCMonth() + 1 : null,
    birthdayDay: c.following.birthday ? c.following.birthday.getUTCDate() : null,
  }))

  return res.json({ data })
})

// GET /connections/requests
connectionsRouter.get('/requests', async (req: AuthRequest, res: Response) => {
  const requests = await prisma.connection.findMany({
    where: { followingId: req.userId, status: 'PENDING' },
    include: {
      follower: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return res.json({ data: requests.map((r) => ({ ...r.follower, requestId: r.id })) })
})

// GET /connections/outgoing — ids this user already sent requests to (pending)
connectionsRouter.get('/outgoing', async (req: AuthRequest, res: Response) => {
  const rows = await prisma.connection.findMany({
    where: { followerId: req.userId, status: 'PENDING' },
    select: { followingId: true },
  })
  return res.json({ data: rows.map((r) => r.followingId) })
})

// GET /connections/outgoing/details — who I asked, with their names, so the
// Requests tab can show "waiting on them" (Emerald, Oct 27)
connectionsRouter.get('/outgoing/details', async (req: AuthRequest, res: Response) => {
  const rows = await prisma.connection.findMany({
    where: { followerId: req.userId, status: 'PENDING' },
    select: {
      id: true,
      createdAt: true,
      following: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return res.json({
    data: rows.map((r) => ({
      requestId: r.id,
      sentAt: r.createdAt,
      ...r.following,
    })),
  })
})

// GET /connections/user/:userId — get a user's accepted connections
connectionsRouter.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  const { userId } = req.params

  const connections = await prisma.connection.findMany({
    where: { followerId: userId, status: 'ACCEPTED' },
    include: {
      following: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = connections.map((c) => ({
    id: c.following.id,
    username: c.following.username,
    displayName: c.following.displayName,
    avatarUrl: c.following.avatarUrl,
  }))

  return res.json({ data })
})

// POST /connections/request/:userId
connectionsRouter.post('/request/:userId', async (req: AuthRequest, res: Response) => {
  const { userId } = req.params
  if (userId === req.userId) return res.status(400).json({ error: "You can't connect with yourself." })

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return res.status(404).json({ error: 'User not found.' })

  const existing = await prisma.connection.findUnique({
    where: { followerId_followingId: { followerId: req.userId!, followingId: userId } },
  })
  if (existing) return res.status(409).json({ error: 'Request already sent.' })

  const connection = await prisma.connection.create({
    data: {
      followerId: req.userId!,
      followingId: userId,
      status: target.isPrivate ? 'PENDING' : 'ACCEPTED',
    },
  })
  // Until now a request landed silently: the only way to know was to open
  // QTs and scroll (Emerald, Oct 27). Now they get a notification and a push.
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { displayName: true, username: true } })
  await prisma.notification.create({
    data: {
      userId: target.id,
      type: 'NEW_FOLLOWER',
      title: 'Someone wants to be your QT',
      body: `${me?.displayName ?? 'Someone'} (@${me?.username}) sent you a QT request.`,
    },
  }).catch(() => {})
  pushToUserDevices(target.id, 'Someone wants to be your QT', `${me?.displayName ?? 'Someone'} sent you a QT request.`).catch(() => {})

  return res.status(201).json({ data: connection })
})

// POST /connections/accept/:requestId
connectionsRouter.post('/accept/:requestId', async (req: AuthRequest, res: Response) => {
  const { requestId } = req.params
  const request = await prisma.connection.findUnique({ where: { id: requestId } })
  if (!request) return res.status(404).json({ error: 'Request not found.' })
  if (request.followingId !== req.userId) return res.status(403).json({ error: 'Not yours to accept.' })
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Already handled.' })

  const updated = await prisma.connection.update({
    where: { id: requestId },
    data: { status: 'ACCEPTED' },
  })

  const accepter = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (accepter) {
    await notifyUser(
      request.followerId,
      'friendRequestAccepted',
      `${accepter.displayName} accepted your QT request`,
      "You're connected! Send them something cute.",
    )
  }

  const accepted = await prisma.connection.findUnique({
    where: { id: String(req.params.requestId) },
    select: { followerId: true },
  }).catch(() => null)
  if (accepted) {
    const them = await prisma.user.findUnique({ where: { id: req.userId! }, select: { displayName: true } })
    const wants = await prisma.user.findUnique({ where: { id: accepted.followerId }, select: { notifyFriendRequestAccepted: true } })
    await prisma.notification.create({
      data: {
        userId: accepted.followerId,
        type: 'NEW_FOLLOWER',
        title: "You're QTs now",
        body: `${them?.displayName ?? 'They'} accepted your request.`,
      },
    }).catch(() => {})
    if (wants?.notifyFriendRequestAccepted !== false) {
      pushToUserDevices(accepted.followerId, "You're QTs now", `${them?.displayName ?? 'They'} accepted your request.`).catch(() => {})
    }
  }

  return res.json({ data: updated })
})

// POST /connections/decline/:requestId
connectionsRouter.post('/decline/:requestId', async (req: AuthRequest, res: Response) => {
  const { requestId } = req.params
  const request = await prisma.connection.findUnique({ where: { id: requestId } })
  if (!request) return res.status(404).json({ error: 'Request not found.' })
  if (request.followingId !== req.userId) return res.status(403).json({ error: 'Not yours to decline.' })
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Already handled.' })

  await prisma.connection.delete({ where: { id: requestId } })
  return res.json({ data: { ok: true } })
})

// POST /connections/privacy — toggle public/private profile
connectionsRouter.post('/privacy', async (req: AuthRequest, res: Response) => {
  const { isPrivate } = req.body
  if (typeof isPrivate !== 'boolean') {
    return res.status(400).json({ error: 'Please provide isPrivate as true or false.' })
  }
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { isPrivate },
    select: { isPrivate: true },
  })
  return res.json({ data: user })
})

// DELETE /connections/:userId
connectionsRouter.delete('/:userId', async (req: AuthRequest, res: Response) => {
  const { userId } = req.params
  await prisma.connection.deleteMany({
    where: {
      OR: [
        { followerId: req.userId!, followingId: userId },
        { followerId: userId, followingId: req.userId! },
      ],
    },
  })
  return res.json({ data: { ok: true } })
})
