import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

// Notifications were being written and pushed to phones with nowhere to read
// them. The bell on the profile page is their home now (Emerald, Oct 28).
export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

// GET /notifications — newest first, the last 60
notificationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const data = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { id: true, type: true, title: true, body: true, isRead: true, createdAt: true },
  })
  res.json({ data })
})

// GET /notifications/unread-count — the number on the nav bar
notificationsRouter.get('/unread-count', async (req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.userId!, isRead: false },
  })
  res.json({ data: { count } })
})

// POST /notifications/read — she opened the bell, so they have been checked
notificationsRouter.post('/read', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId!, isRead: false },
    data: { isRead: true },
  })
  res.json({ data: { ok: true } })
})
