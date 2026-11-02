import { Preferences } from '@capacitor/preferences'
import { isNativeApp } from './native'

// Where the login token lives.
//
// Emerald, Nov 2: force quitting Qute Dev logged her out. The dev copy loads
// over plain http from the mini, and iOS treats storage for a non-secure
// origin as disposable, so the webview's localStorage can be wiped between
// launches. The token now also goes into the app's own native storage, which
// survives force quits, and is copied back into localStorage on boot.
//
// localStorage stays the source of truth at runtime (every request reads it
// synchronously); native storage is the backup.

const KEY = 'cn_token'

export function readToken(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function writeToken(token: string) {
  try { localStorage.setItem(KEY, token) } catch { /* private mode */ }
  if (isNativeApp) Preferences.set({ key: KEY, value: token }).catch(() => {})
}

export function clearToken() {
  try { localStorage.removeItem(KEY) } catch { /* private mode */ }
  if (isNativeApp) Preferences.remove({ key: KEY }).catch(() => {})
}

// Called once before the app asks who you are: if the webview forgot the
// token but the phone still has it, put it back.
export async function restoreToken(): Promise<string | null> {
  const here = readToken()
  if (here) {
    if (isNativeApp) Preferences.set({ key: KEY, value: here }).catch(() => {})
    return here
  }
  if (!isNativeApp) return null
  try {
    const { value } = await Preferences.get({ key: KEY })
    if (value) {
      try { localStorage.setItem(KEY, value) } catch { /* private mode */ }
      return value
    }
  } catch { /* plugin missing on web */ }
  return null
}
