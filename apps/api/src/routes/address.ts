import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
// @ts-ignore — lob package has no types
import Lob from 'lob'

const lob = new Lob(process.env.LOB_API_KEY)

export const addressRouter = Router()
addressRouter.use(requireAuth)

const addressSchema = z.object({
  line1:   z.string().min(1).max(200),
  line2:   z.string().max(200).optional(),
  city:    z.string().min(1).max(100),
  state:   z.string().min(1).max(100),
  zip:     z.string().min(1).max(20),
  country: z.string().min(1).max(100).default('US'),
})

// GET /address/autocomplete?q=185+Berr&city=&state=
// Type-ahead for the address fields, so people pick a REAL address instead
// of typing one that cannot be delivered to (Emerald, Oct 26). It goes
// through Lob — the same company that prints and mails the card — so if a
// suggestion comes back, the postcard can physically get there.
//
// NOTE: a Lob TEST key returns a canned "test keys do not autocomplete"
// row. We detect that and return nothing rather than show it to anyone, so
// this screen simply has no suggestions until a live key is in place.
addressRouter.get('/autocomplete', async (req: AuthRequest, res: Response) => {
  const q = String(req.query.q ?? '').trim()
  if (q.length < 4) return res.json({ data: [] })

  try {
    const auth = 'Basic ' + Buffer.from(`${process.env.LOB_API_KEY}:`).toString('base64')
    const r = await fetch('https://api.lob.com/v1/us_autocompletions', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address_prefix: q,
        city: String(req.query.city ?? '') || undefined,
        state: String(req.query.state ?? '') || undefined,
      }),
    })
    if (!r.ok) return res.json({ data: [] })
    const j: any = await r.json()
    const rows = (j?.suggestions ?? [])
      .filter((s: any) => s?.primary_line && !/TEST KEYS/i.test(s.primary_line))
      .slice(0, 6)
      .map((s: any) => ({
        line1: s.primary_line,
        city: s.city,
        state: s.state,
        zip: s.zip_code,
      }))
    return res.json({ data: rows })
  } catch (err: any) {
    console.error('[address/autocomplete]', err?.message ?? err)
    return res.json({ data: [] })   // never block someone typing their address
  }
})

// GET /address/me
addressRouter.get('/me', async (req: AuthRequest, res: Response) => {
  const address = await prisma.address.findUnique({
    where: { userId: req.userId! },
  })
  if (!address) return res.json({ data: null })

  // Return decrypted fields (encryption layer to be added later)
  return res.json({
    data: {
      id:      address.id,
      line1:   address.encryptedLine1,
      line2:   address.encryptedLine2 ?? null,
      city:    address.encryptedCity,
      state:   address.encryptedState,
      zip:     address.encryptedZip,
      country: address.encryptedCountry,
      isVerified: address.isVerified,
    },
  })
})

// POST /address — create or update
addressRouter.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = addressSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  const { line1, line2, city, state, zip, country } = parsed.data

  // Verify address through Lob
  let lobAddressId: string | null = null
  let isVerified = false
  try {
    const verification = await lob.usVerifications.verify({
      primary_line: line1,
      secondary_line: line2 ?? '',
      city,
      state,
      zip_code: zip,
    })
    isVerified = verification.deliverability === 'deliverable' || verification.deliverability === 'deliverable_unnecessary_unit'
    lobAddressId = verification.id ?? null
  } catch (lobErr: any) {
    console.error('Lob verification error:', lobErr?.message ?? lobErr)
  }

  const address = await prisma.address.upsert({
    where: { userId: req.userId! },
    update: {
      encryptedLine1:   line1,
      encryptedLine2:   line2 ?? null,
      encryptedCity:    city,
      encryptedState:   state,
      encryptedZip:     zip,
      encryptedCountry: country,
      lobAddressId,
      isVerified,
    },
    create: {
      userId:           req.userId!,
      encryptedLine1:   line1,
      encryptedLine2:   line2 ?? null,
      encryptedCity:    city,
      encryptedState:   state,
      encryptedZip:     zip,
      encryptedCountry: country,
      lobAddressId,
      isVerified,
    },
  })

  return res.json({
    data: {
      id:      address.id,
      line1:   address.encryptedLine1,
      line2:   address.encryptedLine2 ?? null,
      city:    address.encryptedCity,
      state:   address.encryptedState,
      zip:     address.encryptedZip,
      country: address.encryptedCountry,
      isVerified: address.isVerified,
    },
  })
})
