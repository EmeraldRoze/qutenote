import { App as CapApp } from '@capacitor/app'
import { isNativeApp } from './native'

// The web bundle bakes in the build number it was made for. On launch, the
// native app compares that against the build number iOS says is installed.
// If they disagree, the webview is serving STALE pages (the Oct 17 mystery:
// Emerald's phone showed build-33 screens inside the build-34 shell) — so we
// force a cache-busting reload until they match.
export const WEB_BUILD = String(import.meta.env.VITE_BUILD ?? '')

export async function enforceFreshBundle(): Promise<void> {
  if (!isNativeApp || !WEB_BUILD) return
  try {
    const info = await CapApp.getInfo()
    if (info.build && info.build !== WEB_BUILD) {
      const key = 'qn_bundle_reload_for'
      // one reload attempt per installed build — never loop
      if (sessionStorage.getItem(key) === info.build) return
      sessionStorage.setItem(key, info.build)
      const url = new URL(window.location.href)
      url.searchParams.set('v', info.build)
      window.location.replace(url.toString())
    }
  } catch {
    // App plugin unavailable — nothing to enforce
  }
}
