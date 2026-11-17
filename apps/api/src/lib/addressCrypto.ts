// Home addresses, scrambled before they are written down.
//
// The Address columns have been NAMED encryptedLine1, encryptedCity and so on
// since April, but nothing ever scrambled them: every real person's home
// address has been sitting in the database in plain readable text. This is the
// layer that was always meant to be here.
//
// AES-256-GCM. GCM rather than plain AES because it also signs what it wrote,
// so a row that someone edited by hand in the database fails to open instead
// of quietly decoding into a wrong address that we would then post a card to.
//
// STORED SHAPE:  v1:<iv>:<tag>:<ciphertext>   (each part base64)
// The v1 prefix is what lets old plaintext rows and new scrambled rows live
// side by side: anything without the prefix is handed back untouched. That is
// what makes this safe to deploy before the existing rows are converted.
import crypto from 'crypto'

const PREFIX = 'v1'
const ALGO = 'aes-256-gcm'
const IV_BYTES = 12 // what GCM is specified for

let warned = false

function getKey(): Buffer | null {
  const raw = process.env.ADDRESS_ENCRYPTION_KEY
  if (!raw) return null
  const key = Buffer.from(raw.trim(), 'hex')
  if (key.length !== 32) {
    throw new Error('ADDRESS_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate one with: openssl rand -hex 32')
  }
  return key
}

/**
 * Scramble one field on its way into the database.
 *
 * With no key set this stores the text as-is and says so loudly, which keeps
 * a laptop with a half-filled .env working. On the live server that would mean
 * silently storing a home address in the clear while every name in the code
 * says otherwise, so there it refuses instead. If a deploy ever fails on this,
 * the fix is to set ADDRESS_ENCRYPTION_KEY, not to remove the check.
 */
export function encryptField(plain: string): string
export function encryptField(plain: string | null | undefined): string | null
export function encryptField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === '') return plain ?? null

  const key = getKey()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADDRESS_ENCRYPTION_KEY is not set. Refusing to store a home address in plain text.')
    }
    if (!warned) {
      warned = true
      console.warn('[addressCrypto] No ADDRESS_ENCRYPTION_KEY — addresses are being stored in PLAIN TEXT (development only).')
    }
    return plain
  }

  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), body.toString('base64')].join(':')
}

/**
 * Read one field back out.
 *
 * Anything that is not in our stored shape is assumed to be one of the old
 * plaintext rows and is handed straight back, so nothing breaks before the
 * existing rows are converted.
 */
export function decryptField(stored: string): string
export function decryptField(stored: string | null | undefined): string | null
export function decryptField(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === '') return stored ?? null
  if (!stored.startsWith(PREFIX + ':')) return stored // an old plaintext row

  const parts = stored.split(':')
  if (parts.length !== 4) return stored

  const key = getKey()
  if (!key) {
    throw new Error('ADDRESS_ENCRYPTION_KEY is not set, and this address is scrambled. Without the key it cannot be read back.')
  }

  const [, ivB64, tagB64, bodyB64] = parts
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(bodyB64, 'base64')), decipher.final()]).toString('utf8')
}

/** True if this value has already been scrambled. Used by the conversion script. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX + ':') && value.split(':').length === 4
}

// ─── Whole-record helpers ───────────────────────────────────────────────────
// Country is deliberately left readable: it is "US" for everyone, it is not
// what identifies a person, and leaving it legible keeps the simple database
// look-ups that depend on it working.

type AddressParts = {
  line1: string
  line2?: string | null
  city: string
  state: string
  zip: string
}

/** Turn the plain fields the person typed into the columns we store. */
export function encryptAddressParts(a: AddressParts) {
  return {
    encryptedLine1: encryptField(a.line1),
    encryptedLine2: encryptField(a.line2 ?? null),
    encryptedCity: encryptField(a.city),
    encryptedState: encryptField(a.state),
    encryptedZip: encryptField(a.zip),
  }
}

/** The post office's own spelling, which is just as much the person's address. */
export function encryptStandardized(s: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null | undefined) {
  return {
    stdLine1: encryptField(s?.line1 ?? null),
    stdLine2: encryptField(s?.line2 ?? null),
    stdCity: encryptField(s?.city ?? null),
    stdState: encryptField(s?.state ?? null),
    stdZip: encryptField(s?.zip ?? null),
  }
}

type StoredAddress = {
  encryptedLine1: string
  encryptedLine2: string | null
  encryptedCity: string
  encryptedState: string
  encryptedZip: string
  encryptedCountry?: string
  stdLine1?: string | null
  stdLine2?: string | null
  stdCity?: string | null
  stdState?: string | null
  stdZip?: string | null
}

/** Read a whole stored address back into plain text. */
export function decryptAddress(a: StoredAddress) {
  return {
    line1: decryptField(a.encryptedLine1),
    line2: decryptField(a.encryptedLine2),
    city: decryptField(a.encryptedCity),
    state: decryptField(a.encryptedState),
    zip: decryptField(a.encryptedZip),
    country: a.encryptedCountry ?? 'US',
    stdLine1: decryptField(a.stdLine1 ?? null),
    stdLine2: decryptField(a.stdLine2 ?? null),
    stdCity: decryptField(a.stdCity ?? null),
    stdState: decryptField(a.stdState ?? null),
    stdZip: decryptField(a.stdZip ?? null),
  }
}
