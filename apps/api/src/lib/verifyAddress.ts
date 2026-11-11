// Address verification through Melissa (Emerald, Nov 9 2026 — replaces Lob).
//
// WHY MELISSA: Lob charged $0.05 per check with no free allowance, Smarty is
// $552/yr minimum, and the USPS's own API stopped being free on Aug 1 2026
// (paid tiers, signed licence, 60 lookups/hour). Melissa gives ~1,000 free
// developer credits a month and a US check costs 3 of them, so roughly 330
// free checks a month, then about 1.2c each.
//
// WHY PERSONATOR AND NOT GLOBAL ADDRESS: same company, two products. The US
// Personator check costs 3 credits; Global Address costs 10 for the same
// answer on a US address. QuteNote mails inside the US only, so Personator is
// three times cheaper. If QuteNote ever mails abroad, that is the day to add
// doGlobalAddress for non-US countries only.
//
// THE RULE WE PRINT MONEY ON: an address we could not REACH Melissa about is
// never marked bad. That exact mistake with Lob is why zero QuteNotes exist —
// an unreachable verifier quietly failed every address in the database and the
// send flow refused all 25 accounts at the final step. Unreachable = UNCHECKED
// = the card still sends.

export type VerifyStatus = 'GOOD' | 'BAD' | 'UNCHECKED'

export interface AddressInput {
  line1: string
  line2?: string | null
  city: string
  state: string
  zip: string
}

export interface VerifyResult {
  status: VerifyStatus
  /** Melissa's raw result codes, kept verbatim so a weird case can be diagnosed later. */
  codes: string
  /** Plain-English reason, safe to show a human. Null when GOOD. */
  reason: string | null
  /**
   * The USPS-standardised version of the address, when Melissa gave us one.
   * This is what we PRINT — it is the spelling the carrier's walk sequence
   * expects. It is also what we offer back as "did you mean…" on a BAD check.
   */
  standardized: AddressInput | null
}

const ENDPOINT = 'https://personator.melissadata.net/V3/WEB/ContactVerify/doContactVerify'
const TIMEOUT_MS = 6000

// Codes that mean a postcard physically cannot arrive, even though Melissa
// recognised the place. Source: Melissa Personator result-code reference.
const UNDELIVERABLE_AS: Record<string, string> = {
  AS16: 'The post office has this address down as vacant.',
  AS17: 'The post office does not deliver mail to this address.',
  AS18: "This address looks made up — the post office has it flagged.",
  AS27: 'This is a phantom postal route, not a real delivery point.',
  AS09: 'This address is outside the US, which QuteNote cannot mail to yet.',
}

// Melissa's address-error codes, in words a person can act on.
const AE_REASONS: Record<string, string> = {
  AE01: 'That address could not be found. Check the city and ZIP.',
  AE02: 'That street name could not be matched.',
  AE03: "The street's direction or ending (N, St, Ave) does not match.",
  AE04: 'That spot exists but the post office does not deliver to it.',
  AE05: 'That address matches more than one place. It needs more detail.',
  AE06: 'That address is about to change in the postal records.',
  AE07: 'Some of the address is missing.',
  AE08: 'That apartment or suite number is not valid for this building.',
  AE09: 'This building needs an apartment or suite number.',
  AE10: 'That house or building number is not valid for this street.',
  AE11: 'The house or building number is missing.',
  AE12: 'That box number is not valid.',
  AE13: 'The box number is missing.',
  AE14: 'A mailbox-store address needs a PMB number.',
  AE21: 'That address could not be looked up.',
}

function pick(codes: string[], table: Record<string, string>): string | null {
  for (const c of codes) if (table[c]) return table[c]
  return null
}

export async function verifyAddress(addr: AddressInput): Promise<VerifyResult> {
  const first = await checkOnce(addr)

  // AE14 means "this is a mailbox store and the box number is missing". Real
  // case, Nov 11 2026: Bobby's address already HAD its box number, written as
  // a bare "199" on the second line, and Melissa refused it anyway because the
  // post office wants it labelled "PMB 199". Blocking him would have been us
  // refusing an address he typed correctly. So when AE14 comes back and we are
  // holding a bare number, relabel it and ask once more. Costs 3 extra credits,
  // and only in this one case.
  if (first.codes.split(',').includes('AE14')) {
    const bare = (addr.line2 ?? '').trim()
    if (/^\d+$/.test(bare)) {
      const retry = await checkOnce({ ...addr, line2: `PMB ${bare}` })
      if (retry.status === 'GOOD') return retry
    }
  }

  return first
}

async function checkOnce(addr: AddressInput): Promise<VerifyResult> {
  const key = process.env.MELISSA_LICENSE_KEY
  if (!key) {
    // No key configured yet. Say so honestly rather than condemning the address.
    return { status: 'UNCHECKED', codes: '', reason: null, standardized: null }
  }

  const url = new URL(ENDPOINT)
  url.searchParams.set('id', key)
  url.searchParams.set('act', 'Check')          // address check only — no name/phone/email
  url.searchParams.set('a1', addr.line1)
  if (addr.line2) url.searchParams.set('a2', addr.line2)
  url.searchParams.set('city', addr.city)
  url.searchParams.set('state', addr.state)
  url.searchParams.set('postal', addr.zip)
  url.searchParams.set('ctry', 'US')
  url.searchParams.set('format', 'json')

  let json: any
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    const r = await fetch(url, { signal: ctl.signal })
    clearTimeout(timer)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    json = await r.json()
  } catch (err: any) {
    console.error('[verifyAddress] Melissa unreachable:', err?.message ?? err)
    return { status: 'UNCHECKED', codes: '', reason: null, standardized: null }
  }

  // Request-level failures (bad key, out of credits, malformed call) come back
  // as top-level GE codes. Those are OUR problem, not the address's.
  const topLevel = String(json?.Results ?? '')
  if (/GE\d\d/.test(topLevel)) {
    console.error('[verifyAddress] Melissa rejected the request:', topLevel)
    return { status: 'UNCHECKED', codes: topLevel, reason: null, standardized: null }
  }

  const rec = Array.isArray(json?.Records) ? json.Records[0] : null
  if (!rec) {
    console.error('[verifyAddress] Melissa returned no record')
    return { status: 'UNCHECKED', codes: topLevel, reason: null, standardized: null }
  }

  const codes: string[] = String(rec.Results ?? '').split(',').map((c: string) => c.trim()).filter(Boolean)
  const codeStr = codes.join(',')

  // Melissa hands back the carrier-ready spelling. Keep it even on a failed
  // check: on a BAD result it becomes the "did you mean…" we offer the person.
  const standardized: AddressInput | null = rec.AddressLine1
    ? {
        line1: String(rec.AddressLine1),
        line2: rec.Suite ? String(rec.Suite) : null,
        city: String(rec.City ?? addr.city),
        state: String(rec.State ?? addr.state),
        zip: String(rec.PostalCode ?? addr.zip),
      }
    : null

  const aeReason = pick(codes, AE_REASONS)
  if (aeReason) return { status: 'BAD', codes: codeStr, reason: aeReason, standardized }

  const undeliverable = pick(codes, UNDELIVERABLE_AS)
  if (undeliverable) return { status: 'BAD', codes: codeStr, reason: undeliverable, standardized }

  // AS01 is the only code that means "fully verified, deliverable". Anything
  // else without an explicit error is a partial match, which for something we
  // print and stamp is not good enough.
  if (codes.includes('AS01')) return { status: 'GOOD', codes: codeStr, reason: null, standardized }

  return {
    status: 'BAD',
    codes: codeStr,
    reason: 'The post office could not confirm this exact address.',
    standardized,
  }
}
