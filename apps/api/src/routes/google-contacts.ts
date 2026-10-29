import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { requireAuth, AuthRequest } from '../middleware/auth'

// Pull birthdays out of someone's Google Contacts (Emerald, Oct 28).
//
// Birthdays live in Google CONTACTS, not Google Calendar — the "Birthdays"
// calendar is only a view of the contacts — so the People API is the right
// door. Nothing from Google is stored: the consent screen hands us a short
// lived access token, we read the contacts once, and the token dies.
export const googleContactsRouter = Router()

const JWT_SECRET = process.env.JWT_SECRET!
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://qutenote.com/api'
  : 'http://localhost:4000'
const REDIRECT = `${API_URL}/google-contacts/callback`
const SCOPE = 'https://www.googleapis.com/auth/contacts.readonly'

type Where = 'web' | 'native' | 'native-dev'

// POST /google-contacts/start — the app asks for the consent screen link.
// The login token never leaves the app: we mint a 10 minute ticket instead.
googleContactsRouter.post('/start', requireAuth, (req: AuthRequest, res: Response) => {
  const where: Where = req.body?.native ? (req.body?.dev ? 'native-dev' : 'native') : 'web'
  const ticket = jwt.sign({ userId: req.userId!, where, purpose: 'google-contacts' }, JWT_SECRET, { expiresIn: '10m' })
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'online',
    prompt: 'consent',
    state: ticket,
  })
  res.json({ data: { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` } })
})

// GET /google-contacts/callback — Google sends them back here
googleContactsRouter.get('/callback', async (req: Request, res: Response) => {
  const code = String(req.query.code ?? '')
  const state = String(req.query.state ?? '')
  let claims: { userId: string; where: Where; purpose: string }
  try {
    claims = jwt.verify(state, JWT_SECRET) as any
    if (claims.purpose !== 'google-contacts') throw new Error('wrong ticket')
  } catch {
    return res.redirect(`${WEB_URL}/dates?google=failed`)
  }
  if (!code) return res.redirect(`${WEB_URL}/dates?google=failed`)

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT,
      }),
    })
    const tokens = await tokenRes.json() as any
    if (!tokens.access_token) return res.redirect(`${WEB_URL}/dates?google=failed`)

    // Hand the read back to the app, wrapped so only we can open it. The pass
    // expires in 10 minutes and is spent on one read.
    const pass = jwt.sign(
      { userId: claims.userId, googleToken: tokens.access_token, purpose: 'google-contacts-pass' },
      JWT_SECRET,
      { expiresIn: '10m' },
    )

    if (claims.where === 'web') {
      return res.redirect(`${WEB_URL}/dates?gpass=${encodeURIComponent(pass)}`)
    }
    const scheme = claims.where === 'native-dev' ? 'qutenotedev' : 'qutenote'
    const appLink = `${scheme}://google-contacts?pass=${encodeURIComponent(pass)}`
    return res.send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>QuteNote</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #F1EBE3; color: #4A2424;
         display: flex; flex-direction: column; align-items: center; justify-content: center;
         min-height: 90vh; text-align: center; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 8px; }
  p { font-size: 15px; margin-bottom: 28px; }
  a.btn { background: #BADAFF; color: #4A2424; text-decoration: none; font-size: 17px;
          padding: 14px 36px; border-radius: 50px; font-weight: 600; }
</style></head>
<body>
  <h1>Got your contacts</h1>
  <p>Tap below to pick whose birthdays to keep.</p>
  <a class="btn" id="open" href="${appLink}">Back to QuteNote</a>
  <script>setTimeout(function(){ location.href = document.getElementById('open').href }, 400)</script>
</body></html>`)
  } catch {
    return res.redirect(`${WEB_URL}/dates?google=failed`)
  }
})

// POST /google-contacts/birthdays { pass } — spend the pass, read the contacts
googleContactsRouter.post('/birthdays', requireAuth, async (req: AuthRequest, res: Response) => {
  let claims: { userId: string; googleToken: string; purpose: string }
  try {
    claims = jwt.verify(String(req.body?.pass ?? ''), JWT_SECRET) as any
    if (claims.purpose !== 'google-contacts-pass') throw new Error('wrong pass')
  } catch {
    return res.status(400).json({ error: 'That Google link expired. Try again.' })
  }
  if (claims.userId !== req.userId) return res.status(403).json({ error: 'That link belongs to another account.' })

  const people: any[] = []
  let pageToken: string | undefined
  try {
    // Google pages at 1000; three pages is plenty for a personal address book
    for (let page = 0; page < 3; page++) {
      const params = new URLSearchParams({
        personFields: 'names,birthdays,emailAddresses',
        pageSize: '1000',
        sortOrder: 'FIRST_NAME_ASCENDING',
      })
      if (pageToken) params.set('pageToken', pageToken)
      const r = await fetch(`https://people.googleapis.com/v1/people/me/connections?${params}`, {
        headers: { Authorization: `Bearer ${claims.googleToken}` },
      })
      const body = await r.json() as any
      if (!r.ok) return res.status(502).json({ error: body?.error?.message ?? 'Google would not share those contacts.' })
      people.push(...(body.connections ?? []))
      pageToken = body.nextPageToken
      if (!pageToken) break
    }
  } catch {
    return res.status(502).json({ error: 'Could not reach Google just then.' })
  }

  // Only the ones that actually carry a birthday, and only month + day:
  // the year is nobody's business and we never store it.
  const contacts = people.flatMap((p) => {
    const name = p.names?.[0]?.displayName
    const bday = (p.birthdays ?? []).map((b: any) => b.date).find((d: any) => d?.month && d?.day)
    if (!name || !bday) return []
    return [{
      name,
      emails: (p.emailAddresses ?? []).map((e: any) => e.value).filter(Boolean),
      birthday: { month: bday.month, day: bday.day },
    }]
  })

  res.json({ data: { checked: people.length, contacts } })
})
