import { PushNotifications } from '@capacitor/push-notifications'
import { api } from './api'
import { isNativeApp } from './native'

export type ReminderResult = 'on' | 'denied' | 'failed'

let lastFailReason = ''
export function lastReminderFailure(): string {
  return lastFailReason
}

// Ask iOS for notification permission and register this phone for reminders.
export async function enableReminders(): Promise<ReminderResult> {
  localStorage.setItem('qn_reminders', '1')
  lastFailReason = ''
  if (!isNativeApp) { lastFailReason = 'not running as a native app'; return 'failed' }
  try {
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') return 'denied'
    return await new Promise<ReminderResult>((resolve) => {
      let settled = false
      const finish = (result: ReminderResult, reason?: string) => {
        if (settled) return
        settled = true
        if (reason) lastFailReason = reason
        resolve(result)
      }
      PushNotifications.addListener('registration', async (t) => {
        try {
          await api.post('/devices', { token: t.value, platform: 'ios' })
          localStorage.setItem('qn_push', '1')
          finish('on')
        } catch (e: any) {
          finish('failed', 'server: ' + (e?.response?.data?.error ?? e?.message ?? 'unknown'))
        }
      })
      PushNotifications.addListener('registrationError', (err: any) => {
        finish('failed', 'apns: ' + (err?.error ?? JSON.stringify(err)))
      })
      PushNotifications.register()
      // Give a real device on a slow connection a fair chance before giving up.
      setTimeout(() => finish('failed', 'timed out waiting for Apple to respond'), 25000)
    })
  } catch (e: any) {
    lastFailReason = 'permission: ' + (e?.message ?? 'unknown')
    return 'failed'
  }
}

export function remindersEnabled(): boolean {
  return localStorage.getItem('qn_push') === '1'
}
