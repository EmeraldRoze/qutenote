import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const usersRouter = Router()

// ─── Get user profile by username ────────────────────────────────────────────

usersRouter.get('/:username', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      points: true,
      currentStreak: true,
      longestStreak: true,
      isPrivate: true,
      badges: { select: { badgeType: true, earnedAt: true } },
      _count: {
        select: {
          notesSent: true,
          notesReceived: true,
          followers: true,
          following: true,
        },
      },
    },
  })
  if (!user) return res.status(404).json({ error: 'User not found.' })

  let connectionStatus: string | null = null
  if (user.id !== req.userId) {
    const conn = await prisma.connection.findUnique({
      where: { followerId_followingId: { followerId: req.userId!, followingId: user.id } },
    })
    connectionStatus = conn?.status ?? null
  }

  return res.json({ data: { ...user, connectionStatus, isMe: user.id === req.userId } })
})

// ─── Search users ─────────────────────────────────────────────────────────────

usersRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const q = String(req.query.q ?? '').trim()
  if (!q) return res.json({ data: [] })

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { email: { equals: q, mode: 'insensitive' } },
      ],
      NOT: { id: req.userId },
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
    take: 20,
  })
  return res.json({ data: users })
})

// ─── Update my profile ────────────────────────────────────────────────────────

const updateSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).optional(),
  isPrivate: z.boolean().optional(),
  // Profile emoji: only our own torn-paper art paths are allowed
  avatarUrl: z.string().regex(/^\/emoji\/[a-z]+\.png$/, 'Pick one of the QuteNote emoji.').nullable().optional(),
  birthday: z.string().optional(),
})

usersRouter.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = updateSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message })
  }
  const { birthday, ...rest } = result.data

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { ...rest, ...(birthday ? { birthday: new Date(birthday) } : {}) },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      isPrivate: true,
      birthday: true,
    },
  })
  return res.json({ data: user })
})

// ─── Notification preferences ─────────────────────────────────────────────────

const notifSelect = {
  notifyBirthdays: true,
  notifyFriendSentCard: true,
  notifyFriendRequestAccepted: true,
  notifyInviteUsed: true,
  notifyFriendStatusUpdate: true,
} as const

usersRouter.get('/me/notification-preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  const prefs = await prisma.user.findUnique({ where: { id: req.userId }, select: notifSelect })
  return res.json({ data: prefs })
})

const notifSchema = z.object({
  notifyBirthdays: z.boolean().optional(),
  notifyFriendSentCard: z.boolean().optional(),
  notifyFriendRequestAccepted: z.boolean().optional(),
  notifyInviteUsed: z.boolean().optional(),
  notifyFriendStatusUpdate: z.boolean().optional(),
})

usersRouter.put('/me/notification-preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = notifSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message })
  const prefs = await prisma.user.update({ where: { id: req.userId }, data: result.data, select: notifSelect })
  return res.json({ data: prefs })
})
