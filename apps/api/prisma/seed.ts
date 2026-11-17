// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { encryptAddressParts } from '../src/lib/addressCrypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')

  const hash = await bcrypt.hash('password123', 12)

  // ─── Users ───────────────────────────────────────────────────────────────────

  const emerald = await prisma.user.upsert({
    where: { email: 'emerald@qutenote.com' },
    update: {},
    create: {
      email: 'emerald@qutenote.com',
      username: 'emerald',
      displayName: 'Emerald',
      passwordHash: hash,
      points: 120,
      currentStreak: 4,
      longestStreak: 7,
      subscriptionStatus: 'ACTIVE',
      notesAllowance: 5,
      notesUsed: 1,
    },
  })

  const maya = await prisma.user.upsert({
    where: { email: 'maya@qutenote.com' },
    update: {},
    create: {
      email: 'maya@qutenote.com',
      username: 'maya_k',
      displayName: 'Maya K.',
      passwordHash: hash,
      points: 80,
      currentStreak: 2,
      longestStreak: 5,
      subscriptionStatus: 'ACTIVE',
      notesAllowance: 5,
      notesUsed: 2,
    },
  })

  const sofia = await prisma.user.upsert({
    where: { email: 'sofia@qutenote.com' },
    update: {},
    create: {
      email: 'sofia@qutenote.com',
      username: 'sofia_r',
      displayName: 'Sofia R.',
      passwordHash: hash,
      points: 40,
      currentStreak: 0,
      longestStreak: 3,
      subscriptionStatus: 'FREE',
      notesAllowance: 2,
      notesUsed: 0,
    },
  })

  // ─── Addresses (scrambled the same way the real app does) ───────────────────

  await prisma.address.upsert({
    where: { userId: maya.id },
    update: {},
    create: {
      userId: maya.id,
      ...encryptAddressParts({ line1: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' }),
      encryptedCountry: 'US',
    },
  })

  await prisma.address.upsert({
    where: { userId: sofia.id },
    update: {},
    create: {
      userId: sofia.id,
      ...encryptAddressParts({ line1: '456 Elm Ave', city: 'Denver', state: 'CO', zip: '80203' }),
      encryptedCountry: 'US',
    },
  })

  // ─── Connections (emerald follows maya and sofia) ────────────────────────────

  await prisma.connection.upsert({
    where: {
      followerId_followingId: {
        followerId: emerald.id,
        followingId: maya.id,
      },
    },
    update: {},
    create: {
      followerId: emerald.id,
      followingId: maya.id,
      status: 'ACCEPTED',
    },
  })

  await prisma.connection.upsert({
    where: {
      followerId_followingId: {
        followerId: emerald.id,
        followingId: sofia.id,
      },
    },
    update: {},
    create: {
      followerId: emerald.id,
      followingId: sofia.id,
      status: 'ACCEPTED',
    },
  })

  console.log('✅ Done. Users: emerald, maya_k, sofia_r — all password123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
