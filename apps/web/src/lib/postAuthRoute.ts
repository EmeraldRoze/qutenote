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
