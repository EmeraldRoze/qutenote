import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'

export const googleAuthRouter = Router()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://qutenote.com/api'
  : 'http://localhost:4000'

// GET /auth/google — redirect user to Google's consent screen
// ?native=1 means the request came from the iOS app: after sign-in we hand the
// token back to the app via its qutenote:// link instead of the website
googleAuthRouter.get('/google', (req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${API_URL}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: req.query.native === '1' ? 'native' : 'web',
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

// GET /auth/google/callback — Google sends user back here with a code
googleAuthRouter.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query
  if (!code) {
    return res.redirect(`${WEB_URL}/login?error=google_failed`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${API_URL}/auth/google/callback`,
      }),
    })
    const tokens = await tokenRes.json() as any
    if (!tokens.access_token) {
      return res.redirect(`${WEB_URL}/login?error=google_failed`)
    }

    // Get user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const googleUser = await userRes.json() as any
    if (!googleUser.email) {
      return res.redirect(`${WEB_URL}/login?error=google_failed`)
    }

    // Find existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.id }, { email: googleUser.email }] },
    })

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.id },
        })
      }
    } else {
      // Create new user — generate a unique username from their name
      const baseName = (googleUser.name ?? googleUser.email.split('@')[0])
        .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
      let username = baseName
      let suffix = 1
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseName}${suffix}`
        suffix++
      }

      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          displayName: googleUser.name ?? googleUser.email.split('@')[0],
          username,
          googleId: googleUser.id,
          avatarUrl: googleUser.picture ?? null,
        },
      })
    }

    const jwt = signToken(user.id)
    if (req.query.state === 'native') {
      // iOS often blocks automatic redirects into an app, so show a page
      // that tries automatically AND gives the user a button to tap
      const appLink = `qutenote://auth/success?token=${jwt}`
      return res.send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>QuteNote</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #FBF8F4; color: #2E2440;
         display: flex; flex-direction: column; align-items: center; justify-content: center;
         min-height: 90vh; text-align: center; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 8px; }
  p { color: #5C5070; font-size: 15px; margin-bottom: 28px; }
  a.btn { background: #9B8EC4; color: #fff; text-decoration: none; font-size: 17px;
          padding: 14px 36px; border-radius: 50px; font-weight: 500; }
</style></head>
<body>
  <h1>You're signed in! 💌</h1>
  <p>Tap below to hop back into QuteNote.</p>
  <a class="btn" id="open" href="${appLink}">Open QuteNote</a>
  <script>
    // iOS only reliably honors a custom-scheme redirect when it looks like
    // a real tap, not a plain script-set location change, so we simulate a
    // click on the link itself (and still leave it there as a manual fallback).
    document.getElementById('open').click()
  </script>
</body></html>`)
    }
    res.redirect(`${WEB_URL}/auth/google/success?token=${jwt}`)
  } catch (err: any) {
    console.error('Google OAuth error:', err?.message ?? err)
    res.redirect(`${WEB_URL}/login?error=google_failed`)
  }
})
