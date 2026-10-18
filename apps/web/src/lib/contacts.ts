import { Contacts } from '@capacitor-community/contacts'
import { isNativeApp } from './native'
import { api } from './api'

// Contacts sync (Oct 15 redesign): read the person's own address book on
// device, then do two things with it —
//   1. match contact emails against QuteNote members (QT suggestions)
//   2. surface contacts that have birthdays, ready to add to Dates
// Nothing from the address book is stored server-side; emails are sent once
// for matching and the response only echoes addresses the phone already had.

export interface DeviceContact {
  name: string
  emails: string[]
  birthday: { month: number; day: number } | null
}

export interface MatchedMember {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  email: string
}

export const contactsAvailable = isNativeApp

export async function readContacts(): Promise<DeviceContact[] | null> {
  if (!isNativeApp) return null
  // Ask properly: if the phone has never been asked, requestPermissions shows
  // Apple's popup. If it was denied before, iOS silently refuses to re-ask —
  // the UI then points at Settings instead of looking broken.
  const current = await Contacts.checkPermissions()
  let state = current.contacts
  if (state !== 'granted') {
    const requested = await Contacts.requestPermissions()
    state = requested.contacts
  }
  if (state !== 'granted') return null
  const { contacts } = await Contacts.getContacts({
    projection: { name: true, emails: true, birthday: true },
  })
  return contacts
    .map((c) => ({
      name: c.name?.display ?? [c.name?.given, c.name?.family].filter(Boolean).join(' '),
      emails: (c.emails ?? []).map((e) => e.address ?? '').filter(Boolean),
      birthday: c.birthday?.month && c.birthday?.day
        ? { month: c.birthday.month, day: c.birthday.day }
        : null,
    }))
    .filter((c) => c.name)
}

export async function matchContactsToMembers(contacts: DeviceContact[]): Promise<MatchedMember[]> {
  const emails = [...new Set(contacts.flatMap((c) => c.emails))].slice(0, 1000)
  if (!emails.length) return []
  const r = await api.post('/users/match-contacts', { emails })
  return r.data.data
}

export function contactsWithBirthdays(contacts: DeviceContact[]): DeviceContact[] {
  return contacts.filter((c) => c.birthday)
}
