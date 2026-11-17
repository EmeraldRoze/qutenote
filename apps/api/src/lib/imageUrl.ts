// The only picture address a note is allowed to carry is one our own
// /uploads endpoint handed out. Anything else is a stranger giving the
// server an address and asking it to go and fetch that for them, from
// inside our own network — which is how a private service that trusts
// "came from inside the building" ends up answering the outside world.
//
// Enforced in two places on purpose: at POST /notes so a bad value is never
// stored, and again in admin-pdf.ts before the fetch, so rows already in the
// database cannot bite us either.

// What uploads.ts mints: `${WEB_URL}/api/uploads/<uuid>`. The bare /uploads
// spelling is accepted too, since that is the route's own path.
const UPLOAD_PATH =
  /^\/(?:api\/)?uploads\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function allowedHosts(): Set<string> {
  const hosts = new Set(['qutenote.com', 'www.qutenote.com', 'cutenote.club', 'www.cutenote.club'])
  // WEB_URL is what uploads.ts builds the URL from, so it must always be in
  // here — including localhost and the mini's LAN address while developing.
  if (process.env.WEB_URL) {
    try {
      hosts.add(new URL(process.env.WEB_URL).hostname)
    } catch {
      /* a malformed WEB_URL simply adds nothing */
    }
  }
  return hosts
}

export function isOwnUploadUrl(value: string | null | undefined): boolean {
  if (!value) return false

  let u: URL
  try {
    u = new URL(value)
  } catch {
    return false // relative, empty, or nonsense
  }

  // Only the two web protocols. This also shuts out data:, blob: and file:.
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  // user:pass@host is a classic way to make a URL read as one host and
  // resolve as another.
  if (u.username || u.password) return false
  if (!allowedHosts().has(u.hostname)) return false
  // Our upload URLs never carry either, and both are places to hide payload.
  if (u.search || u.hash) return false

  return UPLOAD_PATH.test(u.pathname)
}
