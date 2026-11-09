// Re-check every saved address against Melissa, once.
//
// WHY THIS EXISTS: addresses saved before Nov 9 2026 were "verified" by Lob on
// a test key, which verified nothing, so all of them read unverified. The new
// schema defaults them to UNCHECKED, which lets cards send — correct, but it
// means nobody's address has ever actually been looked at. This gives each one
// a real verdict so a genuinely bad address gets caught before paper and
// postage are spent on it.
//
// COSTS REAL CREDITS: 3 per address. Needs Emerald's FIREFLY before running.
// Usage, from apps/api:
//   node --env-file=../../.env scripts/recheck-addresses.mjs          (dry run)
//   node --env-file=../../.env scripts/recheck-addresses.mjs --write  (saves)

import { PrismaClient } from '@prisma/client'

const WRITE = process.argv.includes('--write')
const prisma = new PrismaClient()

const ENDPOINT = 'https://personator.melissadata.net/V3/WEB/ContactVerify/doContactVerify'

const UNDELIVERABLE_AS = {
  AS16: 'The post office has this address down as vacant.',
  AS17: 'The post office does not deliver mail to this address.',
  AS18: "This address looks made up — the post office has it flagged.",
  AS27: 'This is a phantom postal route, not a real delivery point.',
  AS09: 'This address is outside the US, which QuteNote cannot mail to yet.',
}
const AE_REASONS = {
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

async function check(a) {
  const key = process.env.MELISSA_LICENSE_KEY
  if (!key) throw new Error('MELISSA_LICENSE_KEY is not set — nothing to check with.')
  const url = new URL(ENDPOINT)
  url.searchParams.set('id', key)
  url.searchParams.set('act', 'Check')
  url.searchParams.set('a1', a.encryptedLine1)
  if (a.encryptedLine2) url.searchParams.set('a2', a.encryptedLine2)
  url.searchParams.set('city', a.encryptedCity)
  url.searchParams.set('state', a.encryptedState)
  url.searchParams.set('postal', a.encryptedZip)
  url.searchParams.set('ctry', 'US')
  url.searchParams.set('format', 'json')

  const r = await fetch(url)
  if (!r.ok) return { status: 'UNCHECKED', codes: `HTTP ${r.status}`, reason: null, std: null }
  const j = await r.json()
  if (/GE\d\d/.test(String(j?.Results ?? ''))) {
    return { status: 'UNCHECKED', codes: String(j.Results), reason: null, std: null }
  }
  const rec = Array.isArray(j?.Records) ? j.Records[0] : null
  if (!rec) return { status: 'UNCHECKED', codes: '', reason: null, std: null }

  const codes = String(rec.Results ?? '').split(',').map((c) => c.trim()).filter(Boolean)
  const std = rec.AddressLine1
    ? { line1: rec.AddressLine1, line2: rec.Suite || null, city: rec.City, state: rec.State, zip: rec.PostalCode }
    : null

  for (const c of codes) if (AE_REASONS[c]) return { status: 'BAD', codes: codes.join(','), reason: AE_REASONS[c], std }
  for (const c of codes) if (UNDELIVERABLE_AS[c]) return { status: 'BAD', codes: codes.join(','), reason: UNDELIVERABLE_AS[c], std }
  if (codes.includes('AS01')) return { status: 'GOOD', codes: codes.join(','), reason: null, std }
  return { status: 'BAD', codes: codes.join(','), reason: 'The post office could not confirm this exact address.', std }
}

const rows = await prisma.address.findMany({ include: { user: { select: { username: true } } } })
console.log(`${rows.length} saved addresses. ${WRITE ? 'SAVING results.' : 'DRY RUN — nothing will be saved.'}`)
console.log(`Credits this will spend: ${rows.length * 3}\n`)

const tally = { GOOD: 0, BAD: 0, UNCHECKED: 0 }
for (const a of rows) {
  const v = await check(a)
  tally[v.status]++
  console.log(`@${a.user.username.padEnd(20)} ${v.status.padEnd(9)} ${v.codes}${v.reason ? `  ← ${v.reason}` : ''}`)
  if (WRITE) {
    await prisma.address.update({
      where: { id: a.id },
      data: {
        verifyStatus: v.status,
        verifyCodes: v.codes || null,
        verifyReason: v.reason,
        verifiedAt: v.status === 'UNCHECKED' ? null : new Date(),
        isVerified: v.status === 'GOOD',
        stdLine1: v.std?.line1 ?? null,
        stdLine2: v.std?.line2 ?? null,
        stdCity: v.std?.city ?? null,
        stdState: v.std?.state ?? null,
        stdZip: v.std?.zip ?? null,
      },
    })
  }
}

console.log(`\nGood: ${tally.GOOD}   Bad: ${tally.BAD}   Could not check: ${tally.UNCHECKED}`)
await prisma.$disconnect()
