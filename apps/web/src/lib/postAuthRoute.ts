import { api } from './api'

// Where to land after an Apple/Google sign-in (Emerald's Oct 16 call):
// brand-new accounts pick a handle first; anyone missing an address or a
// birthday walks through those setup steps; everyone else goes Home.
export async function postSocialAuthRoute(isNew: boolean, user?: { birthday?: string | null } | null): Promise<string> {
  if (isNew) return '/signup/handle'
  try {
    const r = await api.get('/address/me')
    if (!r.data.data) return '/signup/address'
  } catch {
    return '/signup/address'
  }
  if (!user?.birthday) return '/signup/birthday'
  return '/home'
}

// Where a half-finished signup should resume (sessionStorage so it survives a
// reload but never outlives the app session).
//
// Emerald, Oct 25 — "the address and birthday steps didn't come up": creating
// an account sets the signed-in user and navigates to /signup/address in the
// same breath. React applied the sign-in a render BEFORE the new address, so
// for one render the app was still on /signup with a logged-in user, and the
// public-route guard fired its "you're logged in, go Home" redirect. Home won.
// Now the guard asks here first, so a brand-new account lands on the step it
// was heading to instead of being yanked Home.
const SETUP_NEXT = 'qn_setup_next'
export function setSetupNext(path: string) {
  try { sessionStorage.setItem(SETUP_NEXT, path) } catch { /* private mode */ }
}
export function getSetupNext(): string | null {
  try { return sessionStorage.getItem(SETUP_NEXT) } catch { return null }
}
export function clearSetupNext() {
  try { sessionStorage.removeItem(SETUP_NEXT) } catch { /* private mode */ }
}
