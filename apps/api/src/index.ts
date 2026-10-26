import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Find .env walking up from cwd
let envPath = path.resolve(process.cwd(), '.env')
if (!fs.existsSync(envPath)) envPath = path.resolve(process.cwd(), '../../.env')
dotenv.config({ path: envPath })
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'

import { authRouter } from './routes/auth'
import { googleAuthRouter } from './routes/google-auth'
import { appleAuthRouter } from './routes/apple-auth'
import { statusesRouter } from './routes/statuses'
import { earlyAccessRouter } from './routes/early-access'
import { devicesRouter } from './routes/devices'
import { uploadsRouter } from './routes/uploads'
import { handwritingRouter } from './routes/handwriting'
import { startScheduler } from './lib/scheduler'
import { usersRouter } from './routes/users'
import { notesRouter } from './routes/notes'
import { cardsRouter } from './routes/cards'
import { usageRouter } from './routes/usage'
import { aiRouter } from './routes/ai'
import { connectionsRouter } from './routes/connections'
import { addressRouter } from './routes/address'
import { stripeRouter, handleStripeWebhook } from './routes/stripe'
import { passItForwardRouter } from './routes/pass-it-forward'
import { adminRouter } from './routes/admin'
import { adminPdfRouter } from './routes/admin-pdf'
import { feedRouter } from './routes/feed'
import { importantDatesRouter } from './routes/important-dates'
import { invitesRouter } from './routes/invites'
import { accountRouter } from './routes/account'
import { artistsRouter } from './routes/artists'

const app = express()
const PORT = process.env.PORT ?? 4000

app.set('trust proxy', 1)

// ─── Security & middleware ────────────────────────────────────────────────────
app.use(helmet())
const ALLOWED_ORIGINS = [
  process.env.WEB_URL ?? 'http://localhost:3000',
  'https://qutenote.com',
  'https://www.qutenote.com',
  'https://cutenote.club',
  'https://www.cutenote.club',
  'capacitor://localhost',
]
// The live-reload dev copy (Qute Dev) loads from the Mac mini's private LAN
// address on the Vite port — allow private-network origins on :5173 only.
const DEV_ORIGIN = /^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+:5173$/
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || DEV_ORIGIN.test(origin)) cb(null, true)
    else cb(null, false)
  },
  credentials: true,
}))
app.use(compression())

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)

// /uploads and /handwriting parse their own (bigger) JSON bodies — skip the app-wide 1mb cap there
const jsonBody = express.json({ limit: '1mb' })
app.use((req, res, next) => (
  req.path.startsWith('/uploads') || req.path.startsWith('/handwriting') ? next() : jsonBody(req, res, next)
))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/account', accountRouter)
app.use('/artists', artistsRouter)
app.use('/auth', authRouter)
app.use('/auth', googleAuthRouter)
app.use('/auth', appleAuthRouter)
app.use('/statuses', statusesRouter)
app.use('/early-access', earlyAccessRouter)
app.use('/devices', devicesRouter)
app.use('/uploads', uploadsRouter)
app.use('/handwriting', handwritingRouter)
app.use('/users', usersRouter)
app.use('/notes', notesRouter)
app.use('/cards', cardsRouter)
app.use('/usage', usageRouter)
app.use('/ai', aiRouter)
app.use('/connections', connectionsRouter)
app.use('/address', addressRouter)
app.use('/stripe', stripeRouter)
app.use('/pass-it-forward', passItForwardRouter)
app.use('/admin', adminRouter)
app.use('/admin', adminPdfRouter)
app.use('/feed', feedRouter)
app.use('/important-dates', importantDatesRouter)
app.use('/invites', invitesRouter)

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'qutenote-api' })
})

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' })
})

startScheduler()
app.listen(PORT, () => {
  console.log(`QuteNote API running on http://localhost:${PORT}`)
})
