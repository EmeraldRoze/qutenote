import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import sgMail from '@sendgrid/mail'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { requireAuth, AuthRequest } from '../middleware/auth'
import rateLimit from 'express-rate-limit'

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'
const SENDGRID_FROM = process.env.SENDGRID_FROM_EMAIL ?? 'hello@qutenote.com'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again in a minute.' },
})

// ─── Sign Up ──────────────────────────────────────────────────────────────────

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  displayName: z.string().min(1, 'Please enter your name.').max(50),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores.'),
  birthday: z.string().optional(),
})

authRouter.post('/register', authLimiter, async (req: Request, res: Response) => {
  const result = signUpSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message })
  }

  const { email, password, displayName, username, birthday } = result.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })
  if (existing) {
    const field = existing.email === email ? 'email' : 'username'
    return res.status(409).json({ error: `That ${field} is already taken.` })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email, username, displayName, passwordHash,
      birthday: birthday ? new Date(birthday) : null,
    },
    select: {
      id: true, email: true, username: true, displayName: true,
      avatarUrl: true, subscriptionStatus: true, points: true,
      currentStreak: true, isAdmin: true,
      notesAllowance: true, notesUsed: true, giftedCredits: true, isPrivate: true, birthday: true,
    },
  })

  const token = signToken(user.id)
  return res.status(201).json({ data: { token, user } })
})

// ─── Login ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  // `email` is the legacy field name — older installed app builds still send
  // it, and the server deploys instantly while those builds wait on a
  // TestFlight update, so both have to keep working side by side.
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(1),
})

authRouter.post('/login', authLimiter, async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid email or password.' })
  }

  const identifier = result.data.identifier ?? result.data.email
  const { password } = result.data
  if (!identifier) {
    return res.status(400).json({ error: 'Invalid email or password.' })
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
    select: {
      id: true, email: true, username: true, displayName: true,
      avatarUrl: true, subscriptionStatus: true, points: true,
      currentStreak: true, isAdmin: true, passwordHash: true,
      notesAllowance: true, notesUsed: true, giftedCredits: true, isPrivate: true, birthday: true,
    },
  })

  // Resist timing attacks — always compare even if user not found
  const hash = user?.passwordHash ?? '$2b$12$invalidhashpadding000000000000000000000000000000000000'
  const valid = await bcrypt.compare(password, hash)

  if (!user || !valid) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const { passwordHash: _, ...safeUser } = user
  const token = signToken(user.id)
  return res.json({ data: { token, user: safeUser } })
})

// ─── Me ───────────────────────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true, email: true, username: true, displayName: true,
      avatarUrl: true, subscriptionStatus: true, points: true,
      currentStreak: true, isAdmin: true,
      notesAllowance: true, notesUsed: true, giftedCredits: true, isPrivate: true, birthday: true,
    },
  })

  if (!user) return res.status(404).json({ error: 'Account not found.' })
  return res.json({ data: user })
})

// ─── Forgot Password ────────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z.string().email(),
})

authRouter.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  const result = forgotSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const user = await prisma.user.findUnique({ where: { email: result.data.email } })

  // Always return success to avoid revealing which emails exist
  if (!user) {
    return res.json({ data: { message: 'If that email is in our system, we sent a reset link.' } })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt },
  })

  const resetUrl = `${WEB_URL}/reset-password?token=${token}`

  if (process.env.SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        to: user.email,
        from: { email: SENDGRID_FROM, name: 'QuteNote' },
        subject: 'Reset your QuteNote password',
        html: `
          <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:28px;color:#2C2540;margin-bottom:8px;">Reset your password</h1>
            <p style="font-size:15px;color:#6B6480;line-height:1.7;margin-bottom:24px;">
              Hi ${user.displayName}, someone requested a password reset for your QuteNote account.
              Click the button below to choose a new password. This link expires in 1 hour.
            </p>
            <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#9B8EC4;color:#fff;text-decoration:none;border-radius:50px;font-size:15px;font-weight:500;">
              Reset password
            </a>
            <p style="font-size:13px;color:#9590AA;margin-top:32px;line-height:1.6;">
              If you didn't request this, you can safely ignore this email. Your password won't change.
            </p>
          </div>
        `,
      })
    } catch (emailErr: any) {
      console.error('SendGrid error:', emailErr?.message ?? emailErr)
    }
  } else {
    console.log(`[Password Reset] ${user.email} → ${resetUrl}`)
  }

  return res.json({ data: { message: 'If that email is in our system, we sent a reset link.' } })
})

// ─── Reset Password ─────────────────────────────────────────────────────────

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

authRouter.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  const result = resetSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message })
  }

  const reset = await prisma.passwordReset.findUnique({
    where: { token: result.data.token },
  })

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return res.status(400).json({ error: 'This reset link has expired or already been used. Request a new one.' })
  }

  const passwordHash = await bcrypt.hash(result.data.password, 12)

  await prisma.user.update({
    where: { id: reset.userId },
    data: { passwordHash },
  })

  await prisma.passwordReset.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  })

  return res.json({ data: { message: 'Password updated! You can log in now.' } })
})
