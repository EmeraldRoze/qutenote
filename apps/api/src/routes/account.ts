import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const accountRouter = Router()

// ─── Delete my account (Apple requirement) ───────────────────────────────────
// Most dependent rows are ON DELETE CASCADE in the schema (Address, Connection,
// ImportantDate, Badge, Notification, PasswordReset, Invite, Status, Heart,
// DeviceToken, Upload, HandwritingFont) — Postgres removes those with the user.
// Notes and Pass-It-Forward rows are NOT cascading, so they're handled first,
// inside one transaction, in dependency order.

accountRouter.delete('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!

  try {
    await prisma.$transaction([
      // 1. Notes the person sent or received (FKs to User with no cascade)
      prisma.note.deleteMany({ where: { OR: [{ senderId: userId }, { recipientId: userId }] } }),
      // 2. Pass-it-forward gifts they bought (gifter FK is required, no cascade)
      prisma.passItForward.deleteMany({ where: { gifterId: userId } }),
      // 3. Gifts they received belong to another member's history — keep the
      //    row, just detach this person (recipient FK is optional)
      prisma.passItForward.updateMany({ where: { recipientId: userId }, data: { recipientId: null } }),
      // 4. The user row itself — cascades sweep everything else
      prisma.user.delete({ where: { id: userId } }),
    ])
    return res.json({ data: { deleted: true } })
  } catch (err) {
    console.error('Account deletion failed:', err)
    return res.status(500).json({ error: "That didn't go through. Nothing was deleted — try again." })
  }
})
