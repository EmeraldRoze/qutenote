import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { ARTIST_EARNING_CENTS, monthKey } from '../lib/artistPay'

// The artist program (Emerald, Oct 26). An artist profile is switched on
// inside a normal account: apply → she reviews → upload exactly three
// print-ready cards → each card is reviewed → PayPal address for payouts she
// makes by hand. Discovery is by CITY only; nothing finer is ever stored.

export const artistsRouter = Router()

const MIN_W = 1800
const MIN_H = 1200
const BIO_MAX = 140

const publicArtist = {
  id: true,
  artistName: true,
  city: true,
  state: true,
  bio: true,
  portfolioUrl: true,
  instagram: true,
  featuredMonth: true,
  featuredOrder: true,
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
}

// ─── Applying (step 1) ───────────────────────────────────────────────────────

// POST /artists/apply
artistsRouter.post('/apply', requireAuth, async (req: AuthRequest, res: Response) => {
  const { artistName, city, state, bio, portfolioUrl, instagram, phone, rightsConfirmed, sampleUploadIds, idUploadId } = req.body ?? {}

  if (typeof artistName !== 'string' || !artistName.trim()) return res.status(400).json({ error: 'What name do you go by?' })
  if (typeof city !== 'string' || !city.trim()) return res.status(400).json({ error: 'Which city are you in?' })
  if (typeof bio !== 'string' || !bio.trim()) return res.status(400).json({ error: 'Add a short bio.' })
  if (bio.trim().length > BIO_MAX) return res.status(400).json({ error: `Keep the bio under ${BIO_MAX} characters.` })
  if (!portfolioUrl && !instagram) return res.status(400).json({ error: 'Add a portfolio link or your Instagram.' })
  if (rightsConfirmed !== true) return res.status(400).json({ error: 'Please confirm the work is yours to sell.' })

  const samples = Array.isArray(sampleUploadIds) ? sampleUploadIds.slice(0, 3).map(String) : []

  const existing = await prisma.artistProfile.findUnique({ where: { userId: req.userId! } })
  if (existing && existing.status !== 'DECLINED') {
    return res.status(409).json({ error: existing.status === 'APPROVED' ? "You're already a QuteNote artist." : 'Your application is already in.' })
  }

  const data = {
    artistName: artistName.trim().slice(0, 80),
    city: city.trim(),
    state: typeof state === 'string' && state.trim() ? state.trim() : null,
    bio: bio.trim(),
    portfolioUrl: typeof portfolioUrl === 'string' && portfolioUrl.trim() ? portfolioUrl.trim() : null,
    instagram: typeof instagram === 'string' && instagram.trim() ? instagram.trim().replace(/^@/, '') : null,
    phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
    rightsConfirmed: true,
    sampleUploadIds: samples,
    idUploadId: typeof idUploadId === 'string' && idUploadId ? idUploadId : null,
    status: 'PENDING' as const,
    appliedAt: new Date(),
    reviewedAt: null,
    reviewNote: null,
  }

  const profile = existing
    ? await prisma.artistProfile.update({ where: { id: existing.id }, data })
    : await prisma.artistProfile.create({ data: { ...data, userId: req.userId! } })

  // tell the admins straight away — an application sitting unseen is the
  // whole program stalled (Emerald asked for the push)
  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } })
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { displayName: true } })
  for (const a of admins) {
    await prisma.notification.create({
      data: {
        userId: a.id,
        type: 'ARTIST_APPLICATION',
        title: 'New artist application',
        body: `${me?.displayName ?? 'Someone'} applied from ${profile.city}.`,
      },
    }).catch(() => {})
  }

  return res.status(201).json({ data: profile })
})

// ─── The artist's own side ───────────────────────────────────────────────────

// GET /artists/me — my application, my cards, my earnings
artistsRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.artistProfile.findUnique({
    where: { userId: req.userId! },
    include: { cards: { orderBy: { createdAt: 'asc' } } },
  })
  if (!profile) return res.json({ data: null })

  const month = monthKey()
  const [thisMonth, allTime] = await Promise.all([
    prisma.artistEarning.aggregate({
      where: { artistId: profile.id, createdAt: { gte: new Date(`${month}-01T00:00:00Z`) } },
      _sum: { amountCents: true },
    }),
    prisma.artistEarning.aggregate({ where: { artistId: profile.id }, _sum: { amountCents: true } }),
  ])

  const hearts = await heartCounts(profile.cards.map((c) => c.id))

  return res.json({
    data: {
      ...profile,
      cards: profile.cards.map((c) => ({ ...c, hearts: hearts[c.id] ?? 0 })),
      earnings: {
        thisMonthCents: thisMonth._sum.amountCents ?? 0,
        allTimeCents: allTime._sum.amountCents ?? 0,
        perCardCents: ARTIST_EARNING_CENTS,
      },
    },
  })
})

// PUT /artists/me/cards — submit exactly three print-ready cards for review
artistsRouter.put('/me/cards', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.artistProfile.findUnique({ where: { userId: req.userId! } })
  if (!profile) return res.status(404).json({ error: 'Apply first.' })
  if (profile.status !== 'APPROVED') return res.status(403).json({ error: 'Your application is still being reviewed.' })

  const cards = Array.isArray(req.body?.cards) ? req.body.cards : []
  if (cards.length !== 3) return res.status(400).json({ error: 'Three cards, no more and no less.' })

  for (const c of cards) {
    if (!c?.title || typeof c.title !== 'string') return res.status(400).json({ error: 'Every card needs a title.' })
    if (!c?.uploadId) return res.status(400).json({ error: 'Every card needs a picture.' })
    const w = Number(c.width ?? 0)
    const h = Number(c.height ?? 0)
    // 4x6 at print resolution. Reject small files here with a friendly line.
    if (w && h && (Math.max(w, h) < MIN_W || Math.min(w, h) < MIN_H)) {
      return res.status(400).json({
        error: `"${c.title}" is too small to print (${w}x${h}). Postcards need at least ${MIN_W} by ${MIN_H}.`,
      })
    }
  }

  await prisma.artistCard.deleteMany({ where: { artistId: profile.id, status: { not: 'APPROVED' } } })
  const made = await Promise.all(cards.map((c: any) =>
    prisma.artistCard.create({
      data: {
        artistId: profile.id,
        title: String(c.title).slice(0, 60),
        uploadId: String(c.uploadId),
        width: c.width ? Number(c.width) : null,
        height: c.height ? Number(c.height) : null,
        status: 'IN_REVIEW',
      },
    })
  ))

  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } })
  for (const a of admins) {
    await prisma.notification.create({
      data: { userId: a.id, type: 'ARTIST_APPLICATION', title: 'Cards waiting for review', body: `${made.length} new cards from ${profile.city}.` },
    }).catch(() => {})
  }

  return res.json({ data: made })
})

// PUT /artists/me/paypal — where their money goes (paid by hand for now)
artistsRouter.put('/me/paypal', requireAuth, async (req: AuthRequest, res: Response) => {
  const email = String(req.body?.paypalEmail ?? '').trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "That doesn't look like an email." })
  const profile = await prisma.artistProfile.findUnique({ where: { userId: req.userId! } })
  if (!profile) return res.status(404).json({ error: 'Apply first.' })
  const updated = await prisma.artistProfile.update({ where: { id: profile.id }, data: { paypalEmail: email } })
  return res.json({ data: { paypalEmail: updated.paypalEmail } })
})

// ─── Finding artists ─────────────────────────────────────────────────────────

// GET /artists/cities — every city with at least one approved artist
artistsRouter.get('/cities', requireAuth, async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.artistProfile.groupBy({
    by: ['city'],
    where: { status: 'APPROVED' },
    _count: { city: true },
    orderBy: { _count: { city: 'desc' } },
  })
  return res.json({ data: rows.map((r) => ({ city: r.city, artists: r._count.city })) })
})

// GET /artists?city=Austin — approved artists in a city (city match is loose
// so "austin" and "Austin " both land)
artistsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const city = String(req.query.city ?? '').trim()
  const artists = await prisma.artistProfile.findMany({
    where: {
      status: 'APPROVED',
      ...(city ? { city: { equals: city, mode: 'insensitive' as const } } : {}),
    },
    select: { ...publicArtist, cards: { where: { status: 'APPROVED' }, select: { id: true, title: true, uploadId: true, sentCount: true } } },
    take: 60,
  })
  return res.json({ data: artists })
})

// GET /artists/featured — this month's five, in her order
artistsRouter.get('/featured', requireAuth, async (_req: AuthRequest, res: Response) => {
  const artists = await prisma.artistProfile.findMany({
    where: { status: 'APPROVED', featuredMonth: monthKey() },
    orderBy: { featuredOrder: 'asc' },
    select: { ...publicArtist, cards: { where: { status: 'APPROVED' }, select: { id: true, title: true, uploadId: true, sentCount: true } } },
    take: 5,
  })
  return res.json({ data: artists })
})

// GET /artists/:username — the public profile a stranger sees: name, handle,
// city, two counts and the cards for sale. Nothing else.
artistsRouter.get('/:username', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { username: String(req.params.username).toLowerCase() },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  })
  if (!user) return res.status(404).json({ error: 'No artist by that name.' })

  const profile = await prisma.artistProfile.findUnique({
    where: { userId: user.id },
    include: { cards: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'asc' } } },
  })
  if (!profile || profile.status !== 'APPROVED') return res.status(404).json({ error: 'No artist by that name.' })

  const [cardsSent, postcardsSent, hearts, saved] = await Promise.all([
    prisma.artistCard.aggregate({ where: { artistId: profile.id }, _sum: { sentCount: true } }),
    prisma.note.count({ where: { senderId: user.id, status: { in: ['SENT', 'PRINTED'] } } }),
    heartCounts(profile.cards.map((c) => c.id)),
    prisma.savedItem.findMany({
      where: { userId: req.userId!, OR: [{ targetType: 'ARTIST', targetId: profile.id }, { targetType: 'ARTIST_CARD', targetId: { in: profile.cards.map((c) => c.id) } }] },
      select: { targetType: true, targetId: true },
    }),
  ])

  const savedSet = new Set(saved.map((s) => `${s.targetType}:${s.targetId}`))
  const myHearts = await prisma.heart.findMany({
    where: { userId: req.userId!, targetType: 'ARTIST_CARD', targetId: { in: profile.cards.map((c) => c.id) } },
    select: { targetId: true },
  })
  const mine = new Set(myHearts.map((h) => h.targetId))

  return res.json({
    data: {
      user,
      artistName: profile.artistName,
      city: profile.city,
      state: profile.state,
      bio: profile.bio,
      instagram: profile.instagram,
      portfolioUrl: profile.portfolioUrl,
      cardsSent: cardsSent._sum.sentCount ?? 0,
      postcardsSent,
      savedArtist: savedSet.has(`ARTIST:${profile.id}`),
      artistId: profile.id,
      cards: profile.cards.map((c) => ({
        id: c.id, title: c.title, uploadId: c.uploadId, sentCount: c.sentCount,
        hearts: hearts[c.id] ?? 0,
        heartedByMe: mine.has(c.id),
        savedByMe: savedSet.has(`ARTIST_CARD:${c.id}`),
      })),
    },
  })
})

// ─── Hearts and saves ────────────────────────────────────────────────────────

// POST /artists/cards/:id/heart — toggle
artistsRouter.post('/cards/:id/heart', requireAuth, async (req: AuthRequest, res: Response) => {
  const targetId = String(req.params.id)
  const existing = await prisma.heart.findUnique({
    where: { userId_targetType_targetId: { userId: req.userId!, targetType: 'ARTIST_CARD', targetId } },
  }).catch(() => null)
  if (existing) {
    await prisma.heart.delete({ where: { id: existing.id } })
  } else {
    await prisma.heart.create({ data: { userId: req.userId!, targetType: 'ARTIST_CARD', targetId } })
  }
  const count = await prisma.heart.count({ where: { targetType: 'ARTIST_CARD', targetId } })
  return res.json({ data: { hearted: !existing, count } })
})

// POST /artists/save — toggle a saved card or a saved artist
artistsRouter.post('/save', requireAuth, async (req: AuthRequest, res: Response) => {
  const targetType = req.body?.targetType === 'ARTIST' ? 'ARTIST' : 'ARTIST_CARD'
  const targetId = String(req.body?.targetId ?? '')
  if (!targetId) return res.status(400).json({ error: 'Nothing to save.' })
  const existing = await prisma.savedItem.findUnique({
    where: { userId_targetType_targetId: { userId: req.userId!, targetType, targetId } },
  }).catch(() => null)
  if (existing) await prisma.savedItem.delete({ where: { id: existing.id } })
  else await prisma.savedItem.create({ data: { userId: req.userId!, targetType, targetId } })
  return res.json({ data: { saved: !existing } })
})

// GET /artists/saved/mine — the Saved tab
artistsRouter.get('/saved/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await prisma.savedItem.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' } })
  const cardIds = rows.filter((r) => r.targetType === 'ARTIST_CARD').map((r) => r.targetId)
  const artistIds = rows.filter((r) => r.targetType === 'ARTIST').map((r) => r.targetId)
  const [cards, artists] = await Promise.all([
    prisma.artistCard.findMany({ where: { id: { in: cardIds }, status: 'APPROVED' }, include: { artist: { select: publicArtist } } }),
    prisma.artistProfile.findMany({ where: { id: { in: artistIds }, status: 'APPROVED' }, select: publicArtist }),
  ])
  return res.json({ data: { cards, artists } })
})

// ─── helpers ─────────────────────────────────────────────────────────────────

async function heartCounts(cardIds: string[]): Promise<Record<string, number>> {
  if (!cardIds.length) return {}
  const rows = await prisma.heart.groupBy({
    by: ['targetId'],
    where: { targetType: 'ARTIST_CARD', targetId: { in: cardIds } },
    _count: { targetId: true },
  })
  return Object.fromEntries(rows.map((r) => [r.targetId, r._count.targetId]))
}
