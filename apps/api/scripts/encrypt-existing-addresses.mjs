// Scramble the home addresses that are already saved.
//
// Every address saved before this was written is sitting in the database in
// plain readable text, despite the columns being named encrypted*. New ones
// are scrambled from now on; these are the ones left behind.
//
// SAFE TO RUN MORE THAN ONCE: a row that is already scrambled is skipped, and
// each row is only written after its new value has been unlocked again and
// checked against the original character for character. If that check ever
// fails the row is left exactly as it was.
//
// WRITES TO THE REAL DATABASE. Needs Emerald's FIREFLY.
// Usage, from apps/api (build first so it shares the app's own lock):
//   npm run build
//   node --env-file=../../.env scripts/encrypt-existing-addresses.mjs         (dry run)
//   node --env-file=../../.env scripts/encrypt-existing-addresses.mjs --write (saves)

import { PrismaClient } from '@prisma/client'

let addressCrypto
try {
  addressCrypto = await import('../dist/lib/addressCrypto.js')
} catch {
  console.error('Build the app first so this script shares its address lock: cd apps/api && npm run build')
  process.exit(1)
}
const { encryptField, decryptField, isEncrypted } = addressCrypto

const WRITE = process.argv.includes('--write')
const prisma = new PrismaClient()

if (!process.env.ADDRESS_ENCRYPTION_KEY) {
  console.error('ADDRESS_ENCRYPTION_KEY is not set. Nothing to scramble with.')
  process.exit(1)
}

// Every column holding a piece of someone's address. Country is deliberately
// left readable: it is "US" for everyone and is not what identifies a person.
const FIELDS = [
  'encryptedLine1', 'encryptedLine2', 'encryptedCity', 'encryptedState', 'encryptedZip',
  'stdLine1', 'stdLine2', 'stdCity', 'stdState', 'stdZip',
]

const rows = await prisma.address.findMany({ include: { user: { select: { username: true } } } })
console.log(`${rows.length} saved addresses. ${WRITE ? 'SAVING.' : 'DRY RUN — nothing will be written.'}\n`)

let changed = 0
let skipped = 0
let refused = 0

for (const row of rows) {
  const data = {}
  const already = []

  for (const f of FIELDS) {
    const current = row[f]
    if (current === null || current === undefined || current === '') continue
    if (isEncrypted(current)) { already.push(f); continue }

    const sealed = encryptField(current)
    // Prove it opens back up to exactly what went in, before we overwrite
    // the only readable copy that exists.
    if (decryptField(sealed) !== current) {
      console.error(`@${row.user.username}: ${f} did not survive the round trip. LEAVING THIS ROW ALONE.`)
      refused++
      data.__broken = true
      break
    }
    data[f] = sealed
  }

  if (data.__broken) continue

  const todo = Object.keys(data)
  if (todo.length === 0) {
    skipped++
    console.log(`@${row.user.username.padEnd(20)} already scrambled (${already.length} fields)`)
    continue
  }

  console.log(`@${row.user.username.padEnd(20)} ${todo.length} fields to scramble${already.length ? `, ${already.length} already done` : ''}`)
  if (WRITE) {
    await prisma.address.update({ where: { id: row.id }, data })
    changed++
  }
}

console.log(`\n${WRITE ? 'Scrambled' : 'Would scramble'}: ${WRITE ? changed : rows.length - skipped - refused}   Already done: ${skipped}   Refused: ${refused}`)
if (!WRITE) console.log('Nothing was written. Re-run with --write to save.')
await prisma.$disconnect()
