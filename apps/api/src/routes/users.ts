import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const usersRouter = Router()

// ─── Match phone contacts to QuteNote members (contacts sync) ────────────────
// The app sends the email addresses from the person's own address book; we
// return which of them are already QTs-to-be. Emails echo back only for the
// addresses the client already had.

// Real address books are huge and messy (Emerald has thousands of contacts,
// and one malformed email used to 400 the whole request). Accept plain
// strings generously and silently skip whatever isn't email-shaped.
const matchContactsSchema = z.object({ emails: z.array(z.string().max(320)).max(10000) })
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

usersRouter.post('/match-contacts', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = matchContactsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid contact list.' })
  const emails = [...new Set(parsed.data.emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_SHAPE.test(e)))].slice(0, 5000)
  if (!emails.length) return res.json({ data: [] })

  const users = await prisma.user.findMany({
    where: {
      email: { in: emails, mode: 'insensitive' },
      NOT: { id: req.userId },
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true, email: true },
    take: 100,
  })
  return res.json({ data: users })
})

// ─── Handle availability check (sign-up: pick your handle) ───────────────────
// Must be registered BEFORE '/:username' so "handle-check" isn't read as a
// username parameter.

const HANDLE_RE = /^[a-z0-9_]{3,20}$/

usersRouter.get('/handle-check', requireAuth, async (req: AuthRequest, res: Response) => {
  const u = String(req.query.u ?? '').trim().toLowerCase()
  const valid = HANDLE_RE.test(u)

  let available = false
  if (valid) {
    const taken = await prisma.user.findFirst({
      where: { username: u, NOT: { id: req.userId } },
      select: { id: true },
    })
    available = !taken
  }

  // Suggest free variants: the handle plus a random two-digit tail
  const base = (valid ? u : u.replace(/[^a-z0-9_]/g, '')).slice(0, 18) || 'qt'
  const suggestions: string[] = []
  const tried = new Set<string>([u])
  while (suggestions.length < 3 && tried.size < 40) {
    const candidate = `${base}${Math.floor(Math.random() * 90 + 10)}`
    if (tried.has(candidate)) continue
    tried.add(candidate)
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })
    if (!exists) suggestions.push(candidate)
  }

  return res.json({ data: { available, suggestions } })
})

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
  username: z
    .string()
    .min(3, 'Handles need at least 3 characters.')
    .max(20, 'Handles max out at 20 characters.')
    .regex(/^[a-z0-9_]+$/, 'Handles can only use lowercase letters, numbers, and underscores.')
    .optional(),
  email: z.string().email('Please enter a valid email address.').optional(),
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

  // Changing the handle: make sure nobody else already has it
  if (rest.username) {
    const taken = await prisma.user.findFirst({
      where: { username: rest.username, NOT: { id: req.userId } },
      select: { id: true },
    })
    if (taken) {
      return res.status(409).json({ error: 'That handle is already taken. Try another one.' })
    }
  }

  // Changing the email: same story
  if (rest.email) {
    const taken = await prisma.user.findFirst({
      where: { email: rest.email, NOT: { id: req.userId } },
      select: { id: true },
    })
    if (taken) {
      return res.status(409).json({ error: 'That email already has an account.' })
    }
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { ...rest, ...(birthday ? { birthday: new Date(birthday) } : {}) },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
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
