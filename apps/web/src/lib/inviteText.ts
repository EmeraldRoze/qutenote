import { api } from './api'

// Creates an invite link and opens the phone's Messages composer with it,
// so the sender picks the contact themselves — no typing numbers into QuteNote.
export async function inviteByText(_firstName?: string) {
  const r = await api.post('/invites', {})
  const link: string = r.data.data.link
  const body = `I saved you a free postcard on QuteNote 💌 Claim it with my personal link: ${link}`
  window.location.href = `sms:?&body=${encodeURIComponent(body)}`
  return link
}

// The recipient is on QuteNote but never added their address — text them a
// nudge that opens their address page (they log in, drop it in, done).
export function askForAddressByText(firstName?: string) {
  const hey = firstName ? `${firstName}! ` : ''
  const body = `${hey}I made you a card on QuteNote 💌 Add your address so I can actually mail it to you: https://qutenote.com/address`
  window.location.href = `sms:?&body=${encodeURIComponent(body)}`
}

// Same invite link, different moment: the sender is mid-card and the person
// they're writing to isn't on QuteNote yet.
export async function inviteRecipientByText() {
  const r = await api.post('/invites', {})
  const link: string = r.data.data.link
  const body = `Someone wants to send you a card 💌 Fill out your address and set up your free QuteNote profile, and it's on its way: ${link}`
  window.location.href = `sms:?&body=${encodeURIComponent(body)}`
  return link
}
