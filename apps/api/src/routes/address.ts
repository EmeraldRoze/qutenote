import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { verifyAddress } from '../lib/verifyAddress'

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
// of typing one that cannot be delivered to (Emerald, Oct 26).
//
// STATUS Nov 9 2026: this has never once worked in the wild. It runs on Lob,
// and a Lob TEST key answers every request with a canned "TEST KEYS DO NOT
// AUTOCOMPLETE" row, which we filter out — so every person who has ever typed
// an address into QuteNote saw zero suggestions. Lob is being removed, and
// without LOB_API_KEY this route simply returns an empty list, which is the
// same thing users already experience. Melissa sells type-ahead (Express
// Entry) if Emerald wants it switched back on; that is a separate decision
// because it is charged per keystroke-search, not per address.
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
      isVerified:   address.isVerified,
      verifyStatus: address.verifyStatus,
      verifyReason: address.verifyReason,
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

  // Check it with Melissa. This NEVER throws and never blocks the save: a
  // person must always be able to store the address they believe is theirs,
  // even mid-outage. The verdict rides along on the record.
  const check = await verifyAddress({ line1, line2, city, state, zip })

  const verifyFields = {
    verifyStatus: check.status,
    verifyCodes:  check.codes || null,
    verifyReason: check.reason,
    verifiedAt:   check.status === 'UNCHECKED' ? null : new Date(),
    stdLine1:     check.standardized?.line1 ?? null,
    stdLine2:     check.standardized?.line2 ?? null,
    stdCity:      check.standardized?.city ?? null,
    stdState:     check.standardized?.state ?? null,
    stdZip:       check.standardized?.zip ?? null,
    // Mirrored for the older code that still reads the boolean.
    isVerified:   check.status === 'GOOD',
  }

  const written = {
    encryptedLine1:   line1,
    encryptedLine2:   line2 ?? null,
    encryptedCity:    city,
    encryptedState:   state,
    encryptedZip:     zip,
    encryptedCountry: country,
    ...verifyFields,
  }

  const address = await prisma.address.upsert({
    where:  { userId: req.userId! },
    update: written,
    create: { userId: req.userId!, ...written },
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
      isVerified:   address.isVerified,
      verifyStatus: address.verifyStatus,
      // Why it failed, and the post office's own spelling of what they think
      // was meant — the screen offers this as "did you mean…" so a blocked
      // address can be fixed in one tap instead of guessed at.
      verifyReason: address.verifyReason,
      suggestion: check.standardized && check.status === 'BAD' ? check.standardized : null,
    },
  })
})
