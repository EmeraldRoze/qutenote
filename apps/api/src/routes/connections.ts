import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
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
          id: true, username: true, displayName: true, avatarUrl: true,
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
