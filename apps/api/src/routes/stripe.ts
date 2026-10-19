import { Router, Response, Request } from 'express'
import Stripe from 'stripe'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const stripeRouter = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const PRICE_ID = process.env.STRIPE_PRICE_ID!
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

// ─── POST /stripe/checkout — create a Stripe Checkout session ────────────────

stripeRouter.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) return res.status(404).json({ error: 'User not found.' })

    if (user.subscriptionStatus === 'ACTIVE') {
      return res.status(400).json({ error: 'You already have an active subscription.' })
    }

    let customerId = user.stripeCustomerId ?? undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    console.log('Creating checkout session with PRICE_ID:', PRICE_ID)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${WEB_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WEB_URL}/subscribe`,
      metadata: { userId: user.id },
    })

    return res.json({ data: { url: session.url } })
  } catch (err: any) {
    console.error('Stripe checkout error:', err?.message ?? err)
    return res.status(500).json({ error: err?.message ?? 'Something went wrong creating checkout session.' })
  }
})

// ─── POST /stripe/buy-card — one-time $7.95 extra card (Emerald, build 42) ───
// Physical mailed goods, so Stripe (not Apple IAP) is the right rail.

stripeRouter.post('/buy-card', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) return res.status(404).json({ error: 'User not found.' })

    let customerId = user.stripeCustomerId ?? undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 795,
          product_data: { name: 'One extra Qute card', description: 'Printed and mailed — use it any time.' },
        },
      }],
      success_url: `${WEB_URL}/extra-card/success`,
      cancel_url: `${WEB_URL}/extra-card/success?cancelled=1`,
      metadata: { userId: user.id, kind: 'extra_card' },
    })

    return res.json({ data: { url: session.url } })
  } catch (err: any) {
    console.error('Stripe buy-card error:', err?.message ?? err)
    return res.status(500).json({ error: "Couldn't start the purchase. Try again in a moment." })
  }
})

// ─── POST /stripe/portal — open billing portal ───────────────────────────────

stripeRouter.post('/portal', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user?.stripeCustomerId) {
    return res.status(400).json({ error: 'No billing account found.' })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${WEB_URL}/home`,
  })

  return res.json({ data: { url: session.url } })
})

// ─── POST /stripe/webhook — handle Stripe events ─────────────────────────────
// This route needs raw body — registered separately in index.ts

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)
  } catch {
    return res.status(400).json({ error: 'Webhook signature invalid.' })
  }

  const session = event.data.object as any

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = session.metadata?.userId
      if (userId && session.metadata?.kind === 'extra_card') {
        // One-time extra card: a gifted credit the send flow spends after
        // the monthly allowance runs out.
        await prisma.user.update({
          where: { id: userId },
          data: { giftedCredits: { increment: 1 } },
        })
      } else if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'ACTIVE',
            notesAllowance: 2,
            stripeCustomerId: session.customer,
          },
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const customer = await stripe.customers.retrieve(session.customer)
      if (!customer.deleted) {
        const userId = (customer as any).metadata?.userId
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: 'CANCELLED', notesAllowance: 0 },
          })
        }
      }
      break
    }

    case 'invoice.payment_succeeded': {
      // Reset monthly usage when subscription renews
      if (session.subscription) {
        const customer = await stripe.customers.retrieve(session.customer)
        if (!customer.deleted) {
          const userId = (customer as any).metadata?.userId
          if (userId) {
            await prisma.user.update({
              where: { id: userId },
              data: { notesUsed: 0, notesAllowance: 2, subscriptionStatus: 'ACTIVE' },
            })
          }
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const customer = await stripe.customers.retrieve(session.customer)
      if (!customer.deleted) {
        const userId = (customer as any).metadata?.userId
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: 'PAST_DUE' },
          })
        }
      }
      break
    }
  }

  return res.json({ received: true })
}
