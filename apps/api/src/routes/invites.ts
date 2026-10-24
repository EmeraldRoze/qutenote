import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyUser } from '../lib/notify'

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'

export const invitesRouter = Router()

// ─── Create invite & send SMS ────────────────────────────────────────────────

const inviteSchema = z.object({
  name: z.string().min(1, 'Please enter their name.').max(100).optional(),
  phone: z.string().min(10, 'Please enter a valid phone number.').max(20).optional(),
})

invitesRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = inviteSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message })
  }

  const name = result.data.name ?? 'Friend'
  const phone = result.data.phone
  const cleanPhone = (phone ?? '').replace(/[^\d+]/g, '')

  const sender = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { displayName: true, username: true },
  })

  // Personalized, text-friendly token: emeraldroze-4f2a. Collision odds are
  // tiny per user; retry logic below covers the rest.
  let token = ''
  for (let i = 0; i < 5; i++) {
    token = `${sender?.username ?? 'friend'}-${crypto.randomBytes(2).toString('hex')}`
    const clash = await prisma.invite.findUnique({ where: { token } })
    if (!clash) break
    token = ''
  }
  if (!token) token = `${sender?.username ?? 'friend'}-${crypto.randomBytes(8).toString('hex')}`

  const invite = await prisma.invite.create({
    data: {
      senderId: req.userId!,
      recipientName: name,
      recipientPhone: cleanPhone,
      token,
    },
  })

  const link = `${WEB_URL}/i/${token}`

  // No phone given: the sender texts the link themselves from their own Messages app
  if (!phone) {
    return res.status(201).json({ data: { id: invite.id, status: 'link', link, recipientName: name } })
  }

  // Send SMS via Twilio if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilio = require('twilio')
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

      await client.messages.create({
        body: `${sender?.displayName ?? 'Someone'} wants to send you something cute via QuteNote! Share your mailing address so they can mail you a surprise: ${link}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: cleanPhone.startsWith('+') ? cleanPhone : `+1${cleanPhone}`,
      })

      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'SENT', smsSentAt: new Date() },
      })
    } catch (err: any) {
      console.error('Twilio SMS error:', err?.message ?? err)
      return res.status(500).json({ error: 'Failed to send the text message. Please check the phone number and try again.' })
    }
  } else {
    console.log(`[Invite SMS] To: ${cleanPhone} → ${link}`)
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'SENT', smsSentAt: new Date() },
    })
  }

  return res.status(201).json({ data: { id: invite.id, status: 'sent', recipientName: name } })
})

// ─── Get my invites ──────────────────────────────────────────────────────────

invitesRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const invites = await prisma.invite.findMany({
    where: { senderId: req.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      recipientName: true,
      recipientPhone: true,
      status: true,
      addressLine1: true,
      addressCity: true,
      addressState: true,
      createdAt: true,
      completedAt: true,
    },
  })
  return res.json({ data: invites })
})

// ─── Public: get invite info (no auth needed) ────────────────────────────────

invitesRouter.get('/collect/:token', async (req: Request, res: Response) => {
  const invite = await prisma.invite.findUnique({
    where: { token: req.params.token },
    select: {
      id: true,
      recipientName: true,
      status: true,
      sender: { select: { displayName: true, avatarUrl: true } },
    },
  })

  if (!invite) {
    return res.status(404).json({ error: 'This invite link is not valid.' })
  }

  if (invite.status === 'COMPLETED') {
    return res.json({ data: { ...invite, alreadyCompleted: true } })
  }

  return res.json({ data: { ...invite, alreadyCompleted: false } })
})

// ─── Public: submit address (no auth needed) ─────────────────────────────────

const addressSchema = z.object({
  line1:   z.string().min(1, 'Please enter your street address.').max(200),
  line2:   z.string().max(200).optional(),
  city:    z.string().min(1, 'Please enter your city.').max(100),
  state:   z.string().min(1, 'Please enter your state.').max(100),
  zip:     z.string().min(1, 'Please enter your zip code.').max(20),
  country: z.string().max(100).default('US'),
})

invitesRouter.post('/collect/:token', async (req: Request, res: Response) => {
  const invite = await prisma.invite.findUnique({
    where: { token: req.params.token },
  })

  if (!invite) {
    return res.status(404).json({ error: 'This invite link is not valid.' })
  }

  if (invite.status === 'COMPLETED') {
    return res.status(400).json({ error: 'You already submitted your address. Thank you!' })
  }

  const result = addressSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message })
  }

  const { line1, line2, city, state, zip, country } = result.data

  await prisma.invite.update({
    where: { id: invite.id },
    data: {
      addressLine1: line1,
      addressLine2: line2 ?? null,
      addressCity: city,
      addressState: state,
      addressZip: zip,
      addressCountry: country,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  })

  // Every 10 friends who join = a free card (Emerald, Oct 24). Everyone who
  // joins still gets their own card from the monthly allowance.
  const completed = await prisma.invite.count({
    where: { senderId: invite.senderId, status: 'COMPLETED' },
  })
  const earned = completed % 10 === 0
  if (earned) {
    await prisma.user.update({
      where: { id: invite.senderId },
      data: { giftedCredits: { increment: 1 } },
    })
  }
  const toGo = 10 - (completed % 10 === 0 ? 10 : completed % 10)
  await notifyUser(
    invite.senderId,
    'inviteUsed',
    `${invite.recipientName.split(' ')[0]} shared their address`,
    earned
      ? 'That makes 10! You earned a free card, go write someone something.'
      : `${toGo} more ${toGo === 1 ? 'friend' : 'friends'} until your next free card.`,
  )

  return res.json({ data: { message: 'Address saved! Your surprise is on its way.' } })
})
