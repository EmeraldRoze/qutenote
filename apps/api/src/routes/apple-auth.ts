import { Router, Request, Response } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'

export const appleAuthRouter = Router()

// Apple publishes the public keys that prove an identity token really came from them
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID ?? 'club.cutenote.app'
// The sideloaded live-reload dev copy carries its own bundle id; Apple mints
// its tokens for that audience, so accept both (same team, same app).
const APPLE_AUDIENCES = [APPLE_BUNDLE_ID, `${APPLE_BUNDLE_ID}.dev`]

// birthday MUST be in here (Emerald, Nov 18). Leaving it out did three
// things, none of them obvious:
//   1. every Apple sign-in was sent back to the "add your birthday" step,
//      even for people who had already given one, because the app checks
//      `!user.birthday` to decide where to land;
//   2. Home's setup checklist never ticked the birthday box off;
//   3. and because that box could never be ticked, the checklist never
//      completed, so the "add your address" safety net underneath it — which
//      only appears once the checklist is finished — never appeared at all.
// The email login route had birthday all along; this one did not.
const userSelect = {
  id: true, email: true, username: true, displayName: true,
  avatarUrl: true, subscriptionStatus: true, points: true,
  currentStreak: true, isAdmin: true, birthday: true,
  notesAllowance: true, notesUsed: true, giftedCredits: true, isPrivate: true,
} as const

// POST /auth/apple — the iOS app sends Apple's identity token here after native Sign in with Apple
appleAuthRouter.post('/apple', async (req: Request, res: Response) => {
  const { identityToken, fullName } = req.body ?? {}
  if (!identityToken || typeof identityToken !== 'string') {
    return res.status(400).json({ error: 'Missing Apple identity token.' })
  }

  try {
    const { payload } = await jwtVerify(identityToken, appleJWKS, {
      issuer: 'https://appleid.apple.com',
      audience: APPLE_AUDIENCES,
    })

    const appleId = payload.sub
    // Apple only shares the email on the very first sign-in; after that we match by appleId
    const email = typeof payload.email === 'string' ? payload.email : null
    if (!appleId) {
      return res.status(401).json({ error: 'Apple sign-in failed. Please try again.' })
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ appleId }, ...(email ? [{ email }] : [])] },
      select: { ...userSelect, appleId: true },
    })

    // Brand-new accounts take the "pick your handle" step; returning ones go home
    let isNew = false

    if (user) {
      if (!user.appleId) {
        await prisma.user.update({ where: { id: user.id }, data: { appleId } })
      }
    } else {
      if (!email) {
        // No email means Apple thinks this person signed up before, but we have no record
        return res.status(401).json({
          error: 'We could not find your account. In your iPhone Settings, remove QuteNote from "Sign in with Apple" and try again.',
        })
      }

      const displayName = (typeof fullName === 'string' && fullName.trim()) || email.split('@')[0]
      const baseName = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'qutie'
      let username = baseName
      let suffix = 1
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseName}${suffix}`
        suffix++
      }

      user = await prisma.user.create({
        data: { email, displayName, username, appleId },
        select: { ...userSelect, appleId: true },
      })
      isNew = true
    }

    const { appleId: _, ...safeUser } = user
    const token = signToken(user.id)
    return res.json({ data: { token, user: safeUser, isNew } })
  } catch (err: any) {
    console.error('Apple sign-in error:', err?.message ?? err)
    return res.status(401).json({ error: 'Apple sign-in failed. Please try again.' })
  }
})
