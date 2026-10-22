import { Router, Response } from 'express'
import express from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { pushToUserDevices } from '../lib/apns'

// Usability breadcrumbs (Emerald's spec, Oct 2026): the app batches events
// here; brick walls are detected on ingest and flagged in REAL TIME with a
// push to the admins. Analytics must never break the app — this route is
// deliberately forgiving and always answers 200 to valid auth.

export const usageRouter = Router()
usageRouter.use(express.json({ limit: '256kb' }), requireAuth)

const WALL_PUSH_COOLDOWN_MS = 10 * 60 * 1000
let lastWallPushAt = 0

async function flagWall(userId: string | null, kind: string, screen: string | null, target: string | null, detail: string) {
  await prisma.wallFlag.create({ data: { userId, kind, screen, target, detail } })
  // Real-time ping to admins, rate-limited so a rough session can't spam
  const now = Date.now()
  if (now - lastWallPushAt < WALL_PUSH_COOLDOWN_MS) return
  lastWallPushAt = now
  const who = userId
    ? (await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }))?.displayName ?? 'Someone'
    : 'Someone'
  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } })
  for (const a of admins) {
    pushToUserDevices(a.id, 'Brick wall 🧱', `${who}: ${detail}`).catch(() => {})
  }
}

// POST /usage/events — batch of breadcrumbs from one session
usageRouter.post('/events', async (req: AuthRequest, res: Response) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 200) : []
    const sessionId = String(req.body?.sessionId ?? 'unknown').slice(0, 64)
    const rows = events
      .filter((e: any) => e && typeof e.name === 'string')
      .map((e: any) => ({
        userId: req.userId ?? null,
        sessionId,
        name: String(e.name).slice(0, 40),
        screen: e.screen ? String(e.screen).slice(0, 120) : null,
        target: e.target ? String(e.target).slice(0, 160) : null,
        props: e.props && typeof e.props === 'object' ? e.props : undefined,
        createdAt: e.at ? new Date(e.at) : new Date(),
      }))
    if (rows.length) await prisma.usageEvent.createMany({ data: rows })

    // Wall detection on this batch
    for (const e of rows) {
      if (e.name === 'error') {
        await flagWall(e.userId, 'error', e.screen, e.target, `error on ${e.screen ?? '?'}: ${e.target ?? 'unknown'}`)
      } else if (e.name === 'slow_screen') {
        await flagWall(e.userId, 'slow_screen', e.screen, e.target, `${e.screen ?? '?'} took ${(e.props as any)?.ms ?? '?'}ms`)
      }
    }
    // rage taps: same target 5+ times inside this batch within 10s
    const taps = rows.filter((e: any) => e.name === 'tap' && e.target)
    const byTarget = new Map<string, Date[]>()
    for (const t of taps) {
      const k = `${t.screen}|${t.target}`
      byTarget.set(k, [...(byTarget.get(k) ?? []), t.createdAt])
    }
    for (const [k, times] of byTarget) {
      if (times.length >= 5) {
        const span = Math.max(...times.map(Number)) - Math.min(...times.map(Number))
        if (span <= 10_000) {
          const [screen, target] = k.split('|')
          await flagWall(rows[0]?.userId ?? null, 'rage_tap', screen, target, `rage-tapped "${target}" on ${screen}`)
        }
      }
    }
    return res.json({ data: { saved: rows.length } })
  } catch {
    return res.json({ data: { saved: 0 } }) // analytics never errors at the app
  }
})

// ─── Admin dashboard reads ──────────────────────────────────────────────────
async function requireAdmin(req: AuthRequest, res: Response): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isAdmin: true } })
  if (!u?.isAdmin) { res.status(403).json({ error: 'Not authorized.' }); return false }
  return true
}

// GET /usage/summary?days=7 — funnels, features, walls for the dashboard
usageRouter.get('/summary', async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7))
  const since = new Date(Date.now() - days * 86400_000)

  const [funnelRows, featureRows, walls, users] = await Promise.all([
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: since }, name: 'funnel' },
      select: { userId: true, target: true, screen: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.usageEvent.groupBy({
      by: ['target', 'userId'],
      where: { createdAt: { gte: since }, name: 'feature' },
    }),
    prisma.wallFlag.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.user.findMany({ select: { id: true, displayName: true } }),
  ])
  const nameOf = new Map(users.map((u) => [u.id, u.displayName]))

  // funnel events carry target = "<funnel>:<step>" (e.g. "send:write")
  const funnels: Record<string, Record<string, string[]>> = {}
  for (const r of funnelRows) {
    const [funnel, step] = (r.target ?? '').split(':')
    if (!funnel || !step) continue
    funnels[funnel] ??= {}
    funnels[funnel][step] ??= []
    const who = nameOf.get(r.userId ?? '') ?? 'unknown'
    if (!funnels[funnel][step].includes(who)) funnels[funnel][step].push(who)
  }

  const features: Record<string, string[]> = {}
  for (const f of featureRows) {
    if (!f.target) continue
    features[f.target] ??= []
    const who = nameOf.get(f.userId ?? '') ?? 'unknown'
    if (!features[f.target].includes(who)) features[f.target].push(who)
  }

  return res.json({
    data: {
      days,
      funnels,
      features,
      walls: walls.map((w) => ({ ...w, who: nameOf.get(w.userId ?? '') ?? 'unknown' })),
    },
  })
})

// GET /usage/recent — latest raw breadcrumbs (admin debugging / briefings)
usageRouter.get('/recent', async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return
  const rows = await prisma.usageEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(500, Number(req.query.limit) || 200),
  })
  const users = await prisma.user.findMany({ select: { id: true, displayName: true } })
  const nameOf = new Map(users.map((u) => [u.id, u.displayName]))
  return res.json({ data: rows.map((r) => ({ ...r, who: nameOf.get(r.userId ?? '') ?? 'unknown' })) })
})
