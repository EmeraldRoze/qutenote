import { prisma } from './prisma'
import { notifyUser } from './notify'
import { submitDueNotes } from './submitNote'

// A tiny in-process scheduler: checks every minute.
// - Due notes (2-hour edit window closed) get submitted to Lob.
// - Once a day (15:00 UTC ≈ morning in the US) birthday reminders go out,
//   seven days ahead, exactly like the nudge promises.

let lastReminderDate = ''

async function birthdayReminders(): Promise<void> {
  const target = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const month = target.getUTCMonth() + 1
  const day = target.getUTCDate()
  const weekday = target.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })

  // year == null means annual; a set year means one-time, only that year
  const dates = await prisma.importantDate.findMany({
    where: { month, day, OR: [{ year: null }, { year: target.getUTCFullYear() }] },
  })
  if (dates.length === 0) return

  for (const d of dates) {
    const firstName = d.connectionName.split(' ')[0]
    const title = `${firstName}'s ${d.label.toLowerCase()} · in 7 days`
    const body = `${firstName}'s ${d.label.toLowerCase()} is next ${weekday}. Write it now and we'll mail it so it lands on the day.`
    await notifyUser(d.userId, 'birthdayReminders', title, body)
  }
  console.log(`[scheduler] birthday reminders sent for ${dates.length} date(s)`)
}

// Halfppy Birthday! Six months from every birthday on file, a same-day push
// (Emerald, Oct 18). Needs no setup — derived from saved Birthday dates.
async function halfBirthdayPushes(): Promise<void> {
  const today = new Date()
  // The half birthday of (m, d) is today when today == (m+6, d) — with the
  // day clamped for short months (Aug 31 → Feb 28/29).
  const halfSourceMonth = ((today.getUTCMonth() + 6) % 12) + 1 // birthdays whose half-day is this month
  const dates = await prisma.importantDate.findMany({
    where: { label: { startsWith: 'Birthday' }, month: halfSourceMonth, year: null },
  })
  const todayDay = today.getUTCDate()
  const lastDayOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate()
  const due = dates.filter((d) =>
    d.day === todayDay || (d.day > lastDayOfThisMonth && todayDay === lastDayOfThisMonth))
  for (const d of due) {
    const firstName = d.connectionName.split(' ')[0]
    await notifyUser(
      d.userId,
      'birthdayReminders',
      `Halfppy Birthday, ${firstName}! 🎂`,
      `${firstName} is exactly half a year from cake. A little surprise card hits different today.`,
    )
  }
  if (due.length) console.log(`[scheduler] halfppy birthday pushes sent for ${due.length} date(s)`)
}

// Daily usage digest (Emerald's analytics spec): one push each day
// summarizing yesterday's breadcrumbs and brick walls, sent to admins.
async function dailyUsageDigest(): Promise<void> {
  const { prisma } = await import('./prisma')
  const { pushToUserDevices } = await import('./apns')
  const since = new Date(Date.now() - 24 * 3600_000)
  const [events, walls, users] = await Promise.all([
    prisma.usageEvent.findMany({ where: { createdAt: { gte: since } }, select: { userId: true, name: true, target: true } }),
    prisma.wallFlag.findMany({ where: { createdAt: { gte: since } } }),
    prisma.user.findMany({ select: { id: true, displayName: true } }),
  ])
  const nameOf = new Map(users.map((u) => [u.id, u.displayName]))
  const actives = new Set(events.map((e) => e.userId).filter(Boolean))
  const mailed = events.filter((e) => e.name === 'funnel' && e.target === 'send:mailed')
  const started = new Set(events.filter((e) => e.name === 'funnel' && e.target?.startsWith('send:')).map((e) => e.userId))
  const features = new Set(events.filter((e) => e.name === 'feature').map((e) => e.target))
  const wallBits = walls.slice(0, 3).map((w) => `${nameOf.get(w.userId ?? '') ?? '?'} ${w.kind} on ${w.screen ?? '?'}`)
  const body = [
    `${actives.size} tester${actives.size === 1 ? '' : 's'} active`,
    `${started.size} started cards, ${mailed.length} mailed`,
    `${walls.length} wall${walls.length === 1 ? '' : 's'}${wallBits.length ? ` (${wallBits.join('; ')})` : ''}`,
    features.size ? `features touched: ${[...features].slice(0, 6).join(', ')}` : 'no feature touches',
  ].join(' · ')
  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } })
  for (const a of admins) {
    await pushToUserDevices(a.id, 'QuteNote daily digest 🗞️', body).catch(() => {})
  }
  console.log('[scheduler] daily usage digest sent:', body)
}

export function startScheduler(): void {
  setInterval(async () => {
    try {
      await submitDueNotes()
    } catch (e: any) {
      console.error('[scheduler] submitDueNotes error:', e?.message)
    }
    try {
      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      if (now.getUTCHours() === 15 && lastReminderDate !== today) {
        lastReminderDate = today
        await birthdayReminders()
        await halfBirthdayPushes()
        await dailyUsageDigest().catch((e: any) => console.error('[scheduler] digest error:', e?.message))
        // Free mode: the monthly card allowance used to reset when Stripe
        // billed. With nothing billed, reset everyone on the 1st instead.
        // (Idempotent — resetting an already-zero counter is harmless.)
        if (now.getUTCDate() === 1) {
          const { prisma } = await import('./prisma')
          const r = await prisma.user.updateMany({ where: { notesUsed: { gt: 0 } }, data: { notesUsed: 0 } })
          console.log(`[scheduler] monthly allowance reset for ${r.count} member(s)`)
        }
      }
    } catch (e: any) {
      console.error('[scheduler] reminders error:', e?.message)
    }
  }, 60 * 1000)
  console.log('[scheduler] running — edit-window submits every minute, reminders daily at 15:00 UTC')
}
