import { prisma } from './prisma'
import { ARTIST_EARNING_CENTS } from './artistPay'
import { isOwnUploadUrl } from './imageUrl'
import { decryptAddress } from './addressCrypto'
// @ts-ignore — lob package has no types
import Lob from 'lob'

const lob = new Lob(process.env.LOB_API_KEY)

// The 2-hour edit window: notes wait in PENDING after sending, then this
// submits them to Lob for real printing and mailing.
export const EDIT_WINDOW_MS = 2 * 60 * 60 * 1000

export async function submitNoteToLob(noteId: string): Promise<void> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: { sender: true, recipient: true },
  })
  if (!note || note.status !== 'PENDING') return

  const recipientAddress = await prisma.address.findUnique({ where: { userId: note.recipientId } })
  if (!recipientAddress) {
    console.error(`[submitNote] ${noteId}: recipient has no address`)
    await prisma.note.update({ where: { id: noteId }, data: { status: 'FAILED' } })
    return
  }
  const senderAddress = await prisma.address.findUnique({ where: { userId: note.senderId } })

  const to = decryptAddress(recipientAddress)
  const from = senderAddress ? decryptAddress(senderAddress) : null

  const toAddress: any = {
    name: note.recipient.displayName,
    address_line1: to.line1,
    address_city: to.city,
    address_state: to.state,
    address_zip: to.zip,
    address_country: to.country,
  }
  if (to.line2) toAddress.address_line2 = to.line2

  const fromAddress: any = from ? {
    name: note.sender.displayName,
    address_line1: from.line1,
    address_city: from.city,
    address_state: from.state,
    address_zip: from.zip,
    address_country: from.country,
  } : {
    name: 'QuteNote',
    address_line1: '123 Main St',
    address_city: 'Austin',
    address_state: 'TX',
    address_zip: '78701',
    address_country: 'US',
  }
  if (from?.line2) fromAddress.address_line2 = from.line2

  const safeText = note.noteText.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Front of the card: the sender's photo full-bleed, the chosen artist's
  // real artwork, or — most cards right now — a solid tint placeholder
  // while we're still onboarding artists. Art files live on the public site.
  const SITE = process.env.WEB_URL ?? 'https://qutenote.com'
  // Full-bleed real artwork — mirrors apps/web/src/lib/cards.ts
  // (@ellis_tolsma and @bobbybealspresents, Oct 2026 lineup)
  const CARD_ART: Record<string, string> = {
    'et-1': '/cards/ellis_tolsma/ellis_tolsma_1_insects.jpg',
    'et-2': '/cards/ellis_tolsma/ellis_tolsma_2_furby.jpg',
    'et-3': '/cards/ellis_tolsma/ellis_tolsma_3_mermaid.jpg',
    'bb-1': '/cards/bobbybealspresents/bobbybealspresents_1_horse.jpg',
    'bb-2': '/cards/bobbybealspresents/bobbybealspresents_2_flower.jpg',
    'bb-3': '/cards/bobbybealspresents/bobbybealspresents_3_roses.jpg',
  }
  // Solid-color placeholders for cards without real art yet, plus legacy ids
  // from before this catalog (torn-paper emoji centered on a tint)
  const CARD_TINTS: Record<string, { art?: string; bg: string }> = {
    'a2-1': { bg: '#F4ECE6' }, 'a2-2': { bg: '#E3D5CC' }, 'a2-3': { bg: '#9E625F' },
    'a3-1': { bg: '#E9EDF1' }, 'a3-2': { bg: '#EEFC4E' }, 'a3-3': { bg: '#9FE870' },
    'a4-1': { bg: '#F4ECE6' }, 'a4-2': { bg: '#D5ADA3' }, 'a4-3': { bg: '#B4897A' },
    'a5-1': { bg: '#D5ADA3' }, 'a5-2': { bg: '#E3D5CC' }, 'a5-3': { bg: '#9E625F' },
    'lp-1': { art: 'flower', bg: '#F4ECE6' }, 'lp-2': { art: 'clover', bg: '#E9EDF1' }, 'lp-3': { art: 'heart-torn', bg: '#F1EBE3' },
    'tm-1': { art: 'waves', bg: '#F1EBE3' }, 'tm-2': { art: 'rainbow', bg: '#F4ECE6' }, 'tm-3': { art: 'finger', bg: '#E9EDF1' },
    'id-1': { art: 'coffee', bg: '#F1EBE3' }, 'id-2': { art: 'cake', bg: '#F4ECE6' }, 'id-3': { art: 'gift', bg: '#E9EDF1' },
    'km-1': { art: 'moon', bg: '#E4D9F7' }, 'km-2': { art: 'star-gold', bg: '#F4ECE6' }, 'km-3': { art: 'sun', bg: '#F1EBE3' },
    'ra-1': { art: 'envelope-heart', bg: '#F4ECE6' }, 'ra-2': { art: 'heart-lime', bg: '#F1EBE3' }, 'ra-3': { art: 'popper', bg: '#E9EDF1' },
    'design-1': { art: 'flower', bg: '#F4ECE6' }, 'design-2': { art: 'popper', bg: '#E9EDF1' }, 'design-3': { art: 'star-gold', bg: '#F4ECE6' },
  }
  const realArt = note.cardDesignId ? CARD_ART[note.cardDesignId] : undefined
  const tint = note.cardDesignId ? CARD_TINTS[note.cardDesignId] : undefined
  // Checked, not escaped: an address that passes isOwnUploadUrl cannot hold a
  // quote, so it cannot climb out of the src="..." it is dropped into. The
  // note text on this page is escaped; this was the one value that was not.
  const frontPhoto = isOwnUploadUrl(note.cardImageUrl) ? note.cardImageUrl : null
  const frontHtml = frontPhoto
    ? `<html><body style="margin:0;width:6in;height:4in;"><img src="${frontPhoto}" style="width:6in;height:4in;object-fit:cover;display:block;" /></body></html>`
    : realArt
      ? `<html><body style="margin:0;width:6in;height:4in;"><img src="${SITE}${realArt}" style="width:6in;height:4in;object-fit:cover;display:block;" /></body></html>`
      : tint
        ? `<html><body style="margin:0;background:${tint.bg};width:6in;height:4in;display:flex;align-items:center;justify-content:center;">${tint.art ? `<img src="${SITE}/site/${tint.art}.png" style="width:2.6in;height:2.6in;object-fit:contain;" />` : ''}</body></html>`
        : `<html><body style="margin:0;background:linear-gradient(135deg,#E3D5CC,#F1EBE3);width:6in;height:4in;display:flex;align-items:center;justify-content:center;"><p style="font-family:Georgia,serif;font-size:48px;color:#4A2424;text-align:center;">💌</p></body></html>`
  // The back of a postcard is NOT ours to fill. Lob stamps a white address
  // block over the right side and the lower band (it carries the routing
  // barcode and the postage indicia, and the post office requires it to be
  // clear). The old full-width paragraph ran straight underneath it, so a
  // long note simply vanished. Found by rendering a real proof, Nov 4.
  // Measured off that proof: the block starts 2.56in from the left edge
  // and 1.52in down, and runs to both far edges. So the space we own is an
  // L, the full width across the top and only the left column below.
  // The empty right-floated spacer carves that out: pushed down 1.12in by
  // its margin, so lines above it run the full width and lines beside it
  // stop short of the address. shape-outside would be tidier but Lob's
  // renderer ignores it (tried it, text stayed in a narrow column).
  // 12px for a long note so even a 450-character one keeps its signature
  // on the card; the proof with the longest possible note is what set this.
  const noteFontPx = safeText.length <= 200 ? 18 : 12
  const backHtml = `<html><body style="margin:0;padding:0;width:6in;height:4in;background:#F1EBE3;"><div style="box-sizing:border-box;width:6in;height:4in;padding:0.3in;font-family:Georgia,serif;"><div style="float:right;width:3.3in;height:2.28in;margin-top:1.12in;"></div><p style="margin:0;font-size:${noteFontPx}px;color:#2B2238;line-height:1.5;font-style:italic;">${safeText}</p><p style="margin:14px 0 0;font-size:12px;color:#766E82;">With love, ${note.sender.displayName}</p></div></body></html>`

  try {
    const postcard = await lob.postcards.create({
      description: `QuteNote from ${note.sender.displayName}`,
      to: toAddress,
      from: fromAddress,
      front: frontHtml,
      back: backHtml,
      // '6x4' is NOT a Lob size and was rejected with a 422 every time
      // ("size must be a valid postcard size"). Lob writes it short edge
      // first: 4x6, 5x7, 6x9, 6x11. Nobody caught it because no card has
      // ever been sent, so this line had never run against Lob (Nov 4).
      size: '4x6',
      // Lob now refuses any mail piece that is not labelled. A QuteNote is
      // the thing the sender paid us for, not a promotion, so it is
      // operational. Missing this was a second 422 (Nov 4).
      use_type: 'operational',
    })
    await prisma.note.update({ where: { id: note.id }, data: { status: 'SENT', lobNoteId: postcard.id } })

    // If the front of this card belongs to a QuteNote artist, they just
    // earned their fee. One row per card sent, so a payout is provable
    // (Emerald, Oct 26). Never let this break a send.
    await creditArtist(note.id, note.cardDesignId).catch((e) =>
      console.error(`[submitNote] ${note.id}: could not credit the artist`, e))
    console.log(`[submitNote] ${noteId} submitted to Lob as ${postcard.id}`)
  } catch (err: any) {
    console.error(`[submitNote] ${noteId} Lob error:`, err?.message ?? err)
  }
}

// THE AUTOMATIC MAILER IS OFF (Emerald, Nov 9 2026). Printing came in-house:
// Ryan prints the cards at a print shop from an export, so nothing should be
// handed to a mail vendor automatically, and nothing may be marked SENT until
// a card has genuinely been put in the post.
//
// THIS WAS ABOUT TO DO REAL DAMAGE. Lob's postcard create SUCCEEDS on a test
// key — it returns a postcard object that is never printed and never mailed.
// So the moment the new address rules let a note be created, this loop would
// have marked it SENT two hours later, credited the artist, and told the
// sender their card was on its way, for a card that went nowhere. It never
// fired before only because the old address gate meant no note could exist.
//
// `submitNoteToLob` above is left in place, unused, until the print export
// has proven itself on real cards. Then it goes.
export async function dueForPrint(limit = 200): Promise<string[]> {
  const now = new Date()
  const due = await prisma.note.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { mailAt: { not: null, lte: now } },
        { mailAt: null, createdAt: { lte: new Date(now.getTime() - EDIT_WINDOW_MS) } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
    take: limit,
  })
  return due.map((n) => n.id)
}

// An artist is paid every time one of their cards is mailed.
async function creditArtist(noteId: string, cardDesignId: string | null): Promise<void> {
  if (!cardDesignId) return
  const card = await prisma.artistCard.findUnique({ where: { id: cardDesignId }, include: { artist: true } })
  if (!card) return   // one of the house cards, nothing to pay

  await prisma.artistCard.update({ where: { id: card.id }, data: { sentCount: { increment: 1 } } })
  await prisma.artistEarning.create({
    data: { artistId: card.artistId, noteId, amountCents: ARTIST_EARNING_CENTS },
  }).catch(() => {})   // unique on noteId: never pay twice for the same card

  await prisma.notification.create({
    data: {
      userId: card.artist.userId,
      type: 'ARTIST_CARD_SENT',
      title: 'Someone sent your card',
      body: `"${card.title}" is in the mail.`,
    },
  }).catch(() => {})
}
