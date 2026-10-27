import { Router, Request, Response } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { prisma } from '../lib/prisma'

export const earlyAccessRouter = Router()

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })

const schema = z.object({
  email: z.string().email('That email looks off. One more try.'),
  name: z.string().max(80).optional(),
  source: z.string().max(40).optional(),
})

// POST /early-access — the homepage signup forms land here
earlyAccessRouter.post('/', limiter, async (req: Request, res: Response) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message })
  }
  const email = result.data.email.toLowerCase().trim()
  const name = result.data.name?.trim() || null
  await prisma.earlySignup.upsert({
    where: { email },   // stored lower case on the way in, so this matches
    // A repeat signup that now includes a name fills the blank in
    update: name ? { name } : {},
    create: { email, name, source: result.data.source ?? null },
  })
  return res.status(201).json({ data: { ok: true } })
})
