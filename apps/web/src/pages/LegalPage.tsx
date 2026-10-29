import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

// Privacy, Terms and Support, in QuteNote's own voice on QuteNote's own paper
// (Emerald, Oct 29). Google's OAuth verification needs all three reachable
// without logging in, and Apple asks for the support URL at submission.

const UV = '#9E625F'
const INK = '#4A2424'
const INK_MID = '#5C5468'
const CREAM = '#FBF8F4'
const STONE = '#E6E1DC'

const mono = "'Anonymous Pro', monospace"
const display = "'Unbounded', sans-serif"

const OPERATOR = 'Mixtape Labs LLC'
const CONTACT = 'hello@qutenote.com'
const UPDATED = 'October 29, 2026'

const page: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: CREAM,
  backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #EFE8DE 31px, #EFE8DE 32px)',
}
const wrap: React.CSSProperties = {
  maxWidth: '760px', margin: '0 auto', padding: '48px clamp(20px, 5vw, 40px) 90px', boxSizing: 'border-box',
}
const h1: React.CSSProperties = {
  margin: '0 0 6px', fontFamily: display, fontWeight: 400, letterSpacing: '-0.02em',
  color: INK, fontSize: 'clamp(34px, 6vw, 52px)', lineHeight: 1.06,
}
const h2: React.CSSProperties = {
  margin: '40px 0 10px', fontFamily: display, fontWeight: 400,
  color: INK, fontSize: 'clamp(20px, 3vw, 26px)', lineHeight: 1.2,
}
const p: React.CSSProperties = {
  margin: '0 0 14px', fontFamily: mono, fontSize: '16px', lineHeight: 1.7, color: INK_MID,
}
const stamp: React.CSSProperties = {
  fontFamily: mono, fontWeight: 700, fontSize: '12px', letterSpacing: '0.16em',
  textTransform: 'uppercase', color: UV,
}
const li: React.CSSProperties = { ...p, margin: '0 0 8px' }
const list: React.CSSProperties = { margin: '0 0 14px', paddingLeft: '22px' }
const foot: React.CSSProperties = {
  marginTop: '56px', paddingTop: '20px', borderTop: `1.5px solid ${STONE}`,
  display: 'flex', gap: '18px', flexWrap: 'wrap',
}
const footLink: React.CSSProperties = {
  fontFamily: mono, fontSize: '14px', color: UV, textDecoration: 'none', fontWeight: 700,
}

function Mail() {
  return <a href={`mailto:${CONTACT}`} style={{ color: UV, fontWeight: 700 }}>{CONTACT}</a>
}

function Shell({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div style={page}>
      <div style={wrap}>
        <Link to="/" style={{ ...footLink, display: 'inline-block', marginBottom: '26px' }}>← QuteNote</Link>
        <p style={stamp}>{kicker}</p>
        <h1 style={h1}>{title}</h1>
        <p style={{ ...p, color: INK, marginTop: '10px' }}>Last updated {UPDATED}</p>
        {children}
        <div style={foot}>
          <Link to="/privacy" style={footLink}>Privacy</Link>
          <Link to="/terms" style={footLink}>Terms</Link>
          <Link to="/support" style={footLink}>Support</Link>
          <a href={`mailto:${CONTACT}`} style={footLink}>{CONTACT}</a>
        </div>
      </div>
    </div>
  )
}

export function PrivacyPage() {
  return (
    <Shell kicker="The short version: we keep it" title="Privacy policy">
      <p style={p}>
        QuteNote is run by {OPERATOR}. This explains what we collect, why, and what we will never do with it.
        If anything here is unclear, write to <Mail /> and a person will answer.
      </p>

      <h2 style={h2}>What we collect</h2>
      <ul style={list}>
        <li style={li}><b>Your account.</b> Your name, username, email, and if you choose, your photo and birthday.</li>
        <li style={li}><b>Your mailing address.</b> So cards can reach you.</li>
        <li style={li}><b>What you write and send.</b> The words on your cards, the art you pick, photos you upload, voice notes you record, and the handwriting samples you give us so we can print in your hand.</li>
        <li style={li}><b>Your dates and your QTs.</b> Birthdays and occasions you save, and the people you connect with.</li>
        <li style={li}><b>Basic usage.</b> Which screens get opened and which buttons get tapped, so we can tell what is confusing. No advertising trackers, ever.</li>
      </ul>

      <h2 style={h2}>Addresses</h2>
      <p style={p}>
        A mailing address is the most sensitive thing we hold, so it gets the strictest rule in this document.
        An address is used for one purpose: printing and mailing a card. It is encrypted where it is stored.
        <b> It is never shown to the person sending the card.</b> You can send someone a card without ever
        learning where they live, and they can receive one without handing you their address.
      </p>

      <h2 style={h2}>Contacts and Google</h2>
      <p style={p}>
        If you ask us to, QuteNote can read your phone's address book or your Google Contacts to find birthdays
        worth remembering. That only happens when you tap the button and grant permission, and here is exactly
        what we do with it:
      </p>
      <ul style={list}>
        <li style={li}>We read names, email addresses, and birthdays.</li>
        <li style={li}>We keep only the people you choose to add, and only their name and the month and day. We do not store the year.</li>
        <li style={li}>We never store your Google password or keep long-term access to your Google account. The permission we receive lasts minutes and is used once.</li>
        <li style={li}>We never message, email, or mail anyone from your contacts. Nothing is sent on your behalf, ever.</li>
        <li style={li}>We do not sell, rent, or share contact data with anyone.</li>
      </ul>
      <p style={p}>
        QuteNote's use of information received from Google APIs follows the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" style={{ color: UV, fontWeight: 700 }}>Google API Services User Data Policy</a>,
        including the Limited Use requirements. Google user data is never used for advertising, never sold, and
        never used to train any model.
      </p>

      <h2 style={h2}>Who else sees your data</h2>
      <p style={p}>
        Only the companies that make the product work, and only the piece each one needs: our print and mail
        partner gets the card and the delivery address, our payment processor handles your payment (we never see
        your card number), our hosting and database providers store the app, and our email service sends things
        like password resets. We do not sell your data, and we do not share it for advertising.
      </p>

      <h2 style={h2}>Deleting everything</h2>
      <p style={p}>
        In the app, open Settings, then Account, then Delete account. That erases your profile, your addresses,
        your dates, your connections, and the cards you have written. It cannot be undone. A card already in the
        mail cannot be recalled, and we keep the minimum billing records the law requires. You can also write to{' '}
        <Mail /> and ask us to do it for you.
      </p>

      <h2 style={h2}>Children</h2>
      <p style={p}>QuteNote is for people 13 and over. If we learn we have data from a child under 13, we delete it.</p>

      <h2 style={h2}>Changes</h2>
      <p style={p}>
        If this policy changes in a way that matters, we will say so in the app rather than quietly editing this
        page. Questions go to <Mail />.
      </p>
    </Shell>
  )
}

export function TermsPage() {
  return (
    <Shell kicker="The deal between us" title="Terms of service">
      <p style={p}>
        QuteNote is run by {OPERATOR}. Using the app means you agree to what follows. It is short on purpose.
      </p>

      <h2 style={h2}>Your account</h2>
      <p style={p}>
        You need to be 13 or older. Keep your login to yourself, and tell us at <Mail /> if something looks wrong
        with your account.
      </p>

      <h2 style={h2}>What you send</h2>
      <p style={p}>
        You own what you write and the photos you upload. You give us permission to print and mail them, which is
        the whole point. We do not sell your words or your pictures, and we do not use them to train anything.
      </p>
      <p style={p}>
        Do not use QuteNote to harass anyone, to send threats, hate, or sexual content involving minors, to break
        the law, or to mail someone who has asked you to stop. We can refuse or cancel a card, and close accounts
        that do this.
      </p>

      <h2 style={h2}>Paying and printing</h2>
      <p style={p}>
        Prices are shown before you pay. Once a card is sent to the printer we usually cannot stop it, so check
        your spelling. If a card arrives damaged, never arrives, or we print it wrong, write to <Mail /> and we
        will reprint it or refund you. Mail delivery times belong to the postal service, not to us.
      </p>

      <h2 style={h2}>Artists</h2>
      <p style={p}>
        If you sell art through QuteNote, you confirm the work is yours to sell, you keep owning it, and you give
        us permission to print it on cards and show it in the app. You earn a share of each card sent with your
        art, paid out as described in the app. We can remove art that is not yours or does not fit the product.
      </p>

      <h2 style={h2}>The honest disclaimer</h2>
      <p style={p}>
        QuteNote is provided as it is. We work hard to keep it running and to get your mail where it is going, but
        we cannot promise the app will never break or that the post will never lose something. To the extent the
        law allows, {OPERATOR} is not liable for indirect or consequential damages, and our total liability is
        limited to what you paid us in the past twelve months.
      </p>

      <h2 style={h2}>Ending things</h2>
      <p style={p}>
        You can delete your account whenever you like, in Settings, then Account. We can close an account that
        breaks these terms. These terms are governed by the laws of the State of New Mexico.
      </p>
    </Shell>
  )
}

export function SupportPage() {
  return (
    <Shell kicker="A person, not a bot" title="Support">
      <p style={p}>
        Write to <Mail /> and you will get a real answer, usually within a day or two. Tell us your username and,
        if something looks broken, send a screenshot.
      </p>

      <h2 style={h2}>Common things</h2>

      <p style={{ ...p, color: INK, fontWeight: 700, marginBottom: '4px' }}>I cannot log in</p>
      <p style={p}>
        Use Forgot password on the login screen. Your email and username are not case sensitive, so capital letters
        are not the problem. If the reset email does not arrive, check spam, then write to us.
      </p>

      <p style={{ ...p, color: INK, fontWeight: 700, marginBottom: '4px' }}>Where is my card?</p>
      <p style={p}>
        Cards are printed and handed to the postal service, which usually takes a few days to deliver inside the
        United States. If it has been more than two weeks, write to us and we will reprint it or refund you.
      </p>

      <p style={{ ...p, color: INK, fontWeight: 700, marginBottom: '4px' }}>Importing birthdays</p>
      <p style={p}>
        On the Dates screen you can pull birthdays from your phone's contacts or from Google Contacts. We only
        read names and birthdays, we only keep the people you choose, and we never message anyone in your list.
      </p>

      <p style={{ ...p, color: INK, fontWeight: 700, marginBottom: '4px' }}>Deleting your account</p>
      <p style={p}>
        In the app: Settings, then Account, then Delete account. It erases your profile, addresses, dates,
        connections, and cards, and it cannot be undone. Prefer we do it? Email <Mail /> from the address on your
        account.
      </p>

      <p style={{ ...p, color: INK, fontWeight: 700, marginBottom: '4px' }}>Becoming an artist</p>
      <p style={p}>
        Settings, then Become a QuteNote artist. You send samples and a photo ID, we review by hand, and you earn
        on every card sent with your art.
      </p>

      <h2 style={h2}>Who we are</h2>
      <p style={p}>QuteNote is made by {OPERATOR}. Reach us any time at <Mail />.</p>
    </Shell>
  )
}
