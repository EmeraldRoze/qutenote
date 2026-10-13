import { SignInWithApple } from '@capacitor-community/apple-sign-in'
import { Browser } from '@capacitor/browser'
import { api } from './api'

// The system browser (unlike the app's own webview) has no origin to resolve
// a relative path against, so native-only calls need an absolute URL.
const NATIVE_API_ORIGIN = 'https://qutenote.com/api'

// Runs Apple's native sign-in sheet, then trades Apple's proof for a QuteNote login
export async function appleSignIn() {
  const { response } = await SignInWithApple.authorize({
    clientId: 'club.cutenote.app',
    redirectURI: 'https://qutenote.com',
    scopes: 'email name',
  })
  if (!response.identityToken) {
    throw new Error('Apple did not return a sign-in token')
  }
  const fullName = [response.givenName, response.familyName].filter(Boolean).join(' ')
  const res = await api.post('/auth/apple', {
    identityToken: response.identityToken,
    fullName,
  })
  const data = res.data?.data
  if (!data?.token) {
    throw new Error(`server response was missing a login token (got: ${JSON.stringify(res.data).slice(0, 120)})`)
  }
  return data as { token: string; user: any }
}

// Google blocks sign-in inside embedded app views, so we open the system browser.
// The server hands the login back to the app via the qutenote:// link.
export async function openGoogleSignIn() {
  const configured = import.meta.env.VITE_API_BASE
  const base = configured && /^https?:\/\//.test(configured) ? configured : NATIVE_API_ORIGIN
  await Browser.open({ url: `${base}/auth/google?native=1` })
}
