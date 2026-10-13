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
      }
    } catch (e: any) {
      console.error('[scheduler] reminders error:', e?.message)
    }
  }, 60 * 1000)
  console.log('[scheduler] running — edit-window submits every minute, reminders daily at 15:00 UTC')
}
