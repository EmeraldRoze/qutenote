import { useState } from 'react'
import { api } from '../lib/api'

// QuteNote marketing homepage — faithful port of the Oct 2026 website redesign
// (QuteNote Website – Homepage · desktop.html). Artwork lives in /public/site.

const UV = '#9E625F'
const INK = '#4A2424'
const INK_MID = '#5C5468'
const INK_LIGHT = '#766E82'
const CREAM = '#FBF8F4'
const PALE = '#EEE6FA'
const LILAC = '#D9C9F1'
const STONE = '#E6E1DC'
const LIME = '#EEFC4E'

const mono = "'Anonymous Pro', monospace"
const display = "'Unbounded', sans-serif"

const ruled: React.CSSProperties = {
  backgroundColor: CREAM,
  backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, #EFE8DE 31px, #EFE8DE 32px)`,
}
const container: React.CSSProperties = {
  width: '100%', maxWidth: '1200px', margin: '0 auto',
  padding: '0 clamp(20px, 4vw, 48px)', boxSizing: 'border-box',
}
const eyebrow: React.CSSProperties = {
  fontFamily: mono, fontWeight: 700, fontSize: '12px',
  letterSpacing: '0.16em', textTransform: 'uppercase', color: UV,
}
const h2Style: React.CSSProperties = {
  margin: 0, fontFamily: display, fontWeight: 400, letterSpacing: '-0.02em',
  color: INK, fontSize: 'clamp(32px, 4.2vw, 52px)', lineHeight: 1.08,
}
const bodyText: React.CSSProperties = { margin: 0, fontFamily: mono, fontSize: '16px', lineHeight: 1.6, color: INK_MID }
const btnText: React.CSSProperties = {
  fontFamily: mono, fontWeight: 700, fontSize: '14px',
  letterSpacing: '0.12em', textTransform: 'uppercase',
}

// Pre-launch: the website only collects names + emails for the launch list.
// No login or account creation here until launch day.
function SignupForm({ source, buttonLabel }: { source: string; buttonLabel: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setPhase('busy')
    setError('')
    try {
      await api.post('/early-access', { email: email.trim(), name: name.trim() || undefined, source })
      setPhase('done')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'That did not go through. One more try.')
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', width: '100%', maxWidth: '520px', minHeight: '56px' }}>
        <span style={{ fontFamily: mono, fontWeight: 700, fontSize: '16px', color: INK, display: 'flex', alignItems: 'center', gap: '10px' }}>
          You're on the list{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}. We'll write soon.<PostmarkHeart size={26} />
        </span>
      </div>
    )
  }

  const fieldStyle = (err: boolean): React.CSSProperties => ({
    flex: '1 1 200px', minWidth: 0, height: '56px', boxSizing: 'border-box', padding: '0 18px',
    borderRadius: '12px', border: `1.5px solid ${err ? '#E04E6B' : LILAC}`, background: '#fff',
    fontFamily: mono, fontSize: '16px', color: INK, outline: 'none',
  })

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', maxWidth: '520px' }}>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name"
        autoComplete="name" style={fieldStyle(false)} />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Your email address"
        autoComplete="email" style={fieldStyle(phase === 'error')} />
      <button type="submit" disabled={phase === 'busy'} style={{ ...btnText, flex: '0 0 auto', height: '56px', padding: '0 22px', border: 'none', borderRadius: '12px', background: UV, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', opacity: phase === 'busy' ? 0.7 : 1 }}>
        {phase === 'busy' ? 'One sec…' : buttonLabel}<PostmarkHeart />
      </button>
      {phase === 'error' && <span style={{ width: '100%', fontFamily: mono, fontSize: '13px', color: '#E04E6B' }}>{error}</span>}
    </form>
  )
}

function PostmarkHeart({ size = 30 }: { size?: number }) {
  const h = Math.round(size * 2 / 3)
  return (
    <span aria-hidden style={{ position: 'relative', display: 'inline-block', width: size, height: h, flexShrink: 0 }}>
      <img src="/site/heart-lime.png" alt="" style={{ position: 'absolute', inset: 0, width: size, height: h, objectFit: 'contain' }} />
      <img src="/site/waves.png" alt="" style={{ position: 'absolute', inset: 0, width: size, height: h, objectFit: 'contain', filter: 'drop-shadow(0 1px 1px rgba(43,34,56,0.6))' }} />
    </span>
  )
}

function Art({ name, size, style }: { name: string; size: number; style?: React.CSSProperties }) {
  return <img src={`/site/${name}.png`} alt="" style={{ width: size, height: size, objectFit: 'contain', ...style }} />
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLink: React.CSSProperties = { fontFamily: mono, fontSize: '15px', color: INK, textDecoration: 'none' }
  const mobileLink: React.CSSProperties = { fontFamily: mono, fontSize: '17px', color: INK, textDecoration: 'none', padding: '14px 0', borderBottom: `1px solid ${LILAC}` }

  return (
    <div style={{ width: '100%', minHeight: '100%', background: CREAM, color: INK, fontFamily: mono }}>
      <style>{`
        .qn-links-row { display: flex; }
        .qn-burger-btn { display: none; }
        @media (max-width: 760px) {
          .qn-links-row { display: none !important; }
          .qn-burger-btn { display: flex !important; }
        }
        details.qn-faq summary::-webkit-details-marker { display: none; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ position: 'relative', zIndex: 2, background: CREAM, borderBottom: `1px solid ${STONE}` }}>
        <div style={{ ...container, height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <a href="#top" aria-label="QuteNote home" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/site/logo-ink.png" alt="QuteNote" style={{ height: '30px', width: 'auto' }} />
          </a>
          <nav className="qn-links-row" aria-label="Main" style={{ alignItems: 'center', gap: 'clamp(14px, 2.4vw, 32px)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href="#how" style={navLink}>How it works</a>
            <a href="#why" style={navLink}>Why Be Qute?</a>
            <a href="#pricing" style={navLink}>The deal</a>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ ...btnText, fontSize: '12px', height: '44px', padding: '0 18px', borderRadius: '10px', background: UV, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>Get on the list</button>
          </nav>
          <button className="qn-burger-btn" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen} style={{ width: '46px', height: '46px', border: `1.5px solid ${LILAC}`, borderRadius: '12px', background: PALE, color: UV, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            {menuOpen
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background: PALE, borderTop: `1px solid ${LILAC}`, padding: '8px 20px 22px', display: 'flex', flexDirection: 'column' }}>
            <a href="#how" onClick={() => setMenuOpen(false)} style={mobileLink}>How it works</a>
            <a href="#why" onClick={() => setMenuOpen(false)} style={mobileLink}>Why Be Qute?</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} style={mobileLink}>The deal</a>
            <button onClick={() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ ...btnText, marginTop: '18px', height: '52px', borderRadius: '12px', background: UV, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>Get on the list</button>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero ── */}
        <section id="top" style={{ ...ruled, overflow: 'hidden' }}>
          <div style={{ ...container, paddingTop: 'clamp(48px, 7vw, 96px)', paddingBottom: 'clamp(64px, 8vw, 112px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(40px, 5vw, 72px)' }}>
            <div style={{ flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '22px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '32px', padding: '0 14px', borderRadius: '16px', background: PALE, fontFamily: mono, fontWeight: 700, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: UV }}>
                <Art name="star-gold" size={18} />Early access
              </span>
              <h1 style={{ margin: 0, fontFamily: display, fontWeight: 400, letterSpacing: '-0.02em', color: INK, fontSize: 'clamp(46px, 6.4vw, 88px)', lineHeight: 1.0 }}>
                Send something real.
              </h1>
              <p style={{ margin: 0, fontFamily: mono, fontSize: 'clamp(18px, 1.7vw, 22px)', lineHeight: 1.55, color: INK, maxWidth: '540px' }}>
                Sometimes a text just doesn't cut it.
              </p>
              <p style={{ margin: 0, fontFamily: mono, fontSize: '17px', lineHeight: 1.65, color: INK_MID, maxWidth: '540px' }}>
                QuteNote helps you turn what you're feeling into a real postcard, delivered to someone's actual mailbox. We'll handle the logistics, you just bring the feeling.
              </p>
              <SignupForm source="homepage-hero" buttonLabel="I'm in" />
              <span style={{ fontFamily: mono, fontSize: '14px', color: INK_MID }}>Free to join. Your first postcard is on us.</span>
            </div>

            {/* Hero collage */}
            <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '520px', aspectRatio: '1 / 0.92' }}>
                <div style={{ position: 'absolute', left: '14%', top: '18%', width: '66%', aspectRatio: '3 / 2', borderRadius: '6px', background: UV, transform: 'rotate(7deg)', boxShadow: '0 18px 40px rgba(90,50,214,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Art name="flower" size={120} style={{ opacity: 0.95, transform: 'rotate(-10deg)' }} />
                </div>
                <div style={{ position: 'absolute', left: '6%', top: '30%', width: '74%', aspectRatio: '3 / 2', boxSizing: 'border-box', padding: '6% 7%', borderRadius: '6px', backgroundColor: PALE, backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, ${LILAC} 27px, ${LILAC} 28px)`, transform: 'rotate(-5deg)', boxShadow: '0 20px 44px rgba(43,34,56,0.16)', display: 'flex', gap: '6%' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontFamily: mono, fontStyle: 'italic', fontSize: 'clamp(14px, 1.5vw, 19px)', lineHeight: '28px', color: INK }}>Happy birthday, muffin butt. Come visit before you're 32.</span>
                    <span style={{ fontFamily: mono, fontStyle: 'italic', fontSize: '15px', color: UV }}>— Em</span>
                  </div>
                  <div style={{ width: '1px', background: LILAC }} />
                  <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <span style={{ width: '58px', height: '70px', boxSizing: 'border-box', padding: '5px', background: PALE, border: `2.5px dashed ${UV}`, borderRadius: '5px' }}>
                      <span style={{ display: 'flex', width: '100%', height: '100%', background: UV, borderRadius: '2px', alignItems: 'center', justifyContent: 'center' }}><PostmarkHeart /></span>
                    </span>
                    <span style={{ fontFamily: mono, fontWeight: 700, fontSize: '13px', color: INK, marginTop: 'auto' }}>MAYA OKAFOR</span>
                    <span style={{ fontFamily: mono, fontSize: '11px', color: INK_LIGHT }}>ADDRESS ON FILE</span>
                  </div>
                </div>
                <div style={{ position: 'absolute', left: 0, top: '2%', transform: 'rotate(-10deg)' }}><Art name="cake" size={112} /></div>
                <div style={{ position: 'absolute', right: '2%', top: 0, transform: 'rotate(8deg)' }}><Art name="popper" size={104} /></div>
                <div style={{ position: 'absolute', right: 0, bottom: '6%', transform: 'rotate(-6deg)' }}><Art name="camera" size={118} /></div>
                <div style={{ position: 'absolute', left: '6%', bottom: 0, transform: 'rotate(6deg)' }}><Art name="heart-torn" size={86} /></div>
                <span style={{ position: 'absolute', right: '18%', top: '22%', transform: 'rotate(6deg)', fontFamily: mono, fontWeight: 700, fontSize: '12px', letterSpacing: '0.12em', color: INK, background: LIME, padding: '6px 12px', borderRadius: '14px', boxShadow: '0 4px 10px rgba(43,34,56,0.12)' }}>IN 7 DAYS</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" style={{ background: PALE }}>
          <div style={{ ...container, paddingTop: 'clamp(72px, 9vw, 120px)', paddingBottom: 'clamp(72px, 9vw, 120px)', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '760px' }}>
              <span style={eyebrow}>How it works</span>
              <h2 style={h2Style}>Show up beyond the screen.</h2>
              <p style={{ ...bodyText, fontSize: 'clamp(17px, 1.5vw, 19px)', maxWidth: '620px' }}>Remember the dates. Find the words. Send the postcard. QuteNote turns the people you think about into the people you actually reach out to.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {[
                { art: 'heart-torn', step: '01', title: 'Add QTs.', copy: 'Connect with your favorite people.' },
                { art: 'finger', step: '02', title: 'Get the nudge.', copy: 'Birthdays, hard days, weird days, and all the little moments worth creating connection.' },
                { art: 'envelope-heart', step: '03', title: 'Find your words.', copy: 'Write from the heart, with a little help when you need it (NO AI BS).' },
                { art: 'popper', step: '04', title: 'Slide into their mailbox.', copy: 'We print your note and mail it as a real freakin postcard. They get a surprise at the mailbox and you get to feel cool for sending actual mail.' },
              ].map((s) => (
                <div key={s.step} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '28px 24px 30px', borderRadius: '20px', background: CREAM, border: `1px solid ${LILAC}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Art name={s.art} size={92} style={{ margin: '-8px 0 0 -6px' }} />
                    <span style={{ ...eyebrow, fontSize: '11px', color: '#A78BC7' }}>Step {s.step}</span>
                  </div>
                  <h3 style={{ ...h2Style, fontSize: '22px', lineHeight: 1.2 }}>{s.title}</h3>
                  <p style={bodyText}>{s.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Be Qute? ── */}
        <section id="why" style={ruled}>
          <div style={{ ...container, paddingTop: 'clamp(72px, 9vw, 120px)', paddingBottom: 'clamp(72px, 9vw, 120px)', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '760px' }}>
              <span style={eyebrow}>Why Be Qute?</span>
              <h2 style={h2Style}>Card apps send cards. We're here for actual connection.</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {[
                { art: 'envelope-heart', title: "You don't need their address.", copy: 'Connect with your people on QuteNote and you never have to ask for an address yourself.' },
                { art: 'cake', title: 'Remember the little things.', copy: "QuteNote reminds you ahead of time, so you're not scrambling to send a last-minute text or realizing three days later that you forgot." },
                { art: 'star-gold', title: "Help when the words won't come.", copy: "Get thoughtful prompts when you know what you feel but aren't quite sure how to say it. No AI BS, just real feelings." },
                { art: 'flower', title: 'Featured Artists.', copy: 'The card aisle at Walgreens is so BLEH! We curate artists so you can send beautiful art while supporting talented creators.' },
              ].map((f) => (
                <div key={f.title} style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', padding: '26px', borderRadius: '20px', background: PALE }}>
                  <span style={{ width: '76px', height: '76px', minWidth: '76px', borderRadius: '38px', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Art name={f.art} size={58} />
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ ...h2Style, fontSize: '20px', lineHeight: 1.25 }}>{f.title}</h3>
                    <p style={bodyText}>{f.copy}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ ...eyebrow, color: INK }}>This month's featured artists</span>
                <span style={{ fontFamily: mono, fontSize: '14px', color: INK_MID }}>New lineup every month</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '28px' }}>
                {[
                  { art: 'flower', bg: '#CFE2F4', name: 'Wildflower Morning', artist: 'Luna Park', rot: -4 },
                  { art: 'sun', bg: '#DDEBC5', name: 'Sunny Side', artist: 'Doodle Co.', rot: 2 },
                  { art: 'rainbow', bg: LILAC, name: 'Over the Rainbow', artist: 'Inkwell', rot: -2 },
                  { art: 'coffee', bg: '#F7E3B5', name: 'Morning Ritual', artist: 'QuteNote Studio', rot: 4 },
                ].map((a) => (
                  <figure key={a.name} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', transform: `rotate(${a.rot}deg)` }}>
                    <div style={{ aspectRatio: '3 / 2', borderRadius: '6px', border: `6px solid ${CREAM}`, background: a.bg, boxShadow: '0 12px 28px rgba(43,34,56,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Art name={a.art} size={96} />
                    </div>
                    <figcaption style={{ fontFamily: mono, fontSize: '14px', color: INK }}>
                      <b>{a.name}</b> <span style={{ color: INK_LIGHT }}>by {a.artist}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" style={{ background: PALE }}>
          <div style={{ ...container, paddingTop: 'clamp(72px, 9vw, 120px)', paddingBottom: 'clamp(72px, 9vw, 120px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <span style={eyebrow}>The deal</span>
              <h2 style={h2Style}>Make Mail Qute Again.</h2>
            </div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px', padding: '36px 32px', borderRadius: '24px', background: CREAM, border: `2px solid ${UV}`, boxShadow: '0 20px 44px rgba(90,50,214,0.16)', width: '100%', maxWidth: '560px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Art name="envelope-heart" size={64} />
                <span style={eyebrow}>Free right now</span>
              </div>
              <h3 style={{ ...h2Style, fontSize: '26px' }}>QuteNote is free while we get started.</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontFamily: mono, fontSize: '16px', lineHeight: 1.5, color: INK }}>
                  <span style={{ width: '8px', height: '8px', minWidth: '8px', marginTop: '8px', borderRadius: '4px', background: UV }} />Two physical postcards a month.
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontFamily: mono, fontSize: '16px', lineHeight: 1.5, color: INK }}>
                  <span style={{ width: '8px', height: '8px', minWidth: '8px', marginTop: '8px', borderRadius: '4px', background: UV }} />Your people, your dates, your handwriting.
                </li>
              </ul>
              <div style={{ marginTop: 'auto' }}>
                <SignupForm source="homepage-pricing" buttonLabel="Get on the list" />
              </div>
            </div>
            <span style={{ fontFamily: mono, fontSize: '15px', color: INK_MID }}>Printing and postage included. No surprise charges.</span>
          </div>
        </section>

        {/* ── Bleachers ── */}
        <section style={{ background: UV, overflow: 'hidden' }}>
          <div style={{ ...container, paddingTop: 'clamp(80px, 10vw, 136px)', paddingBottom: 'clamp(80px, 10vw, 136px)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '22px' }}>
            <div style={{ position: 'absolute', left: 'clamp(0px, 4vw, 60px)', top: '18%', transform: 'rotate(-12deg)' }}><Art name="popper" size={110} /></div>
            <div style={{ position: 'absolute', right: 'clamp(0px, 4vw, 60px)', bottom: '14%', transform: 'rotate(10deg)' }}><Art name="heart-torn" size={96} /></div>
            <h2 style={{ ...h2Style, color: '#fff', fontSize: 'clamp(36px, 5.6vw, 76px)', lineHeight: 1.04, maxWidth: '900px' }}>Yell it from the bleachers.</h2>
            <p style={{ margin: 0, fontFamily: mono, fontStyle: 'italic', fontSize: 'clamp(19px, 1.8vw, 24px)', color: LIME }}>Don't save the good stuff for later.</p>
            <p style={{ margin: 0, fontFamily: mono, fontSize: 'clamp(17px, 1.5vw, 19px)', lineHeight: 1.6, color: LILAC, maxWidth: '600px' }}>Tell people what they mean to you while you can. The little things have a way of becoming the big things.</p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" style={ruled}>
          <div style={{ ...container, paddingTop: 'clamp(72px, 9vw, 120px)', paddingBottom: 'clamp(72px, 9vw, 120px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(32px, 5vw, 80px)' }}>
            <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px', alignSelf: 'flex-start' }}>
              <span style={eyebrow}>FAQ</span>
              <h2 style={h2Style}>A few things you might be wondering.</h2>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Art name="moon" size={64} style={{ transform: 'rotate(-8deg)' }} />
                <Art name="clover" size={64} style={{ transform: 'rotate(6deg)' }} />
                <Art name="gift" size={64} style={{ transform: 'rotate(-4deg)' }} />
              </div>
            </div>
            <div style={{ flex: '2 1 520px', minWidth: 0, borderTop: `1px solid ${LILAC}` }}>
              {[
                { q: "How do you send a postcard without knowing someone's address?", a: 'Your QTs add their own address once. It stays with us, locked up, and you never see it. You pick the person, write your note, and we handle the rest.', open: true },
                { q: 'How long does delivery take?', a: "Usually 3 to 5 business days within the US. If it's for a birthday or a date that matters, pick the day you want it to arrive and we'll mail it early so it lands on time." },
                { q: 'Can I design my own cards?', a: "Yes. Upload a photo for the front, or pick from this month's featured artists. Either way, you write the back." },
                { q: "What if the person isn't on QuteNote yet?", a: "We'll help you text them a link. They add their address in about a minute, and your postcard goes out. They don't have to join to get it, but it's nice when they do." },
                { q: 'Is my address actually private?', a: "Yes. It's encrypted and only used to mail your postcards. Senders never see it, and we will never sell it." },
                { q: 'When does the app launch?', a: 'The iPhone app is coming soon, and Android follows after. Join now for early access, and your first postcard is on us.' },
              ].map((f) => (
                <details key={f.q} className="qn-faq" open={f.open} style={{ borderBottom: `1px solid ${LILAC}`, padding: '22px 0' }}>
                  <summary style={{ listStyle: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', fontFamily: display, fontWeight: 400, letterSpacing: '-0.02em', color: INK, fontSize: 'clamp(17px, 1.5vw, 20px)', lineHeight: 1.35 }}>
                    {f.q}
                    <span aria-hidden style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '16px', background: PALE, color: UV, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontWeight: 700, fontSize: '18px' }}>+</span>
                  </summary>
                  <p style={{ margin: '14px 0 0', fontFamily: mono, fontSize: '16px', lineHeight: 1.65, color: INK_MID, maxWidth: '640px' }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Join ── */}
        <section id="join" style={{ background: PALE, overflow: 'hidden' }}>
          <div style={{ ...container, paddingTop: 'clamp(72px, 9vw, 120px)', paddingBottom: 'clamp(72px, 9vw, 120px)', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '820px', boxSizing: 'border-box', padding: 'clamp(40px, 6vw, 72px) clamp(24px, 6vw, 72px)', borderRadius: '10px', ...ruled, transform: 'rotate(-1deg)', boxShadow: '0 24px 56px rgba(43,34,56,0.14)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '18px' }}>
              <span style={{ position: 'absolute', top: '22px', right: '22px', width: '64px', height: '76px', boxSizing: 'border-box', padding: '5px', background: PALE, border: `2.5px dashed ${UV}`, borderRadius: '6px', transform: 'rotate(6deg)' }}>
                <span style={{ display: 'flex', width: '100%', height: '100%', background: UV, borderRadius: '3px', alignItems: 'center', justifyContent: 'center' }}><PostmarkHeart /></span>
              </span>
              <div style={{ position: 'absolute', left: '-18px', bottom: '-14px', transform: 'rotate(-10deg)' }}><Art name="envelope-heart" size={96} /></div>
              <h2 style={h2Style}>Someone came to mind, didn't they?</h2>
              <p style={{ margin: 0, fontFamily: mono, fontStyle: 'italic', fontSize: 'clamp(19px, 1.8vw, 23px)', color: UV }}>Go make their day.</p>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                <SignupForm source="homepage-cta" buttonLabel="Send something real" />
              </div>
              <span style={{ fontFamily: mono, fontSize: '14px', color: INK_MID }}>Your first postcard is on us. No spam, ever.</span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: CREAM, borderTop: `1px solid ${STONE}` }}>
        <div style={{ ...container, paddingTop: '40px', paddingBottom: '40px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <img src="/site/logo-ink.png" alt="QuteNote" style={{ height: '26px', width: 'auto' }} />
          <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            <a href="#privacy" style={{ fontFamily: mono, fontSize: '14px', color: INK, textDecoration: 'none' }}>Privacy</a>
            <a href="#terms" style={{ fontFamily: mono, fontSize: '14px', color: INK, textDecoration: 'none' }}>Terms</a>
            <a href="#instagram" style={{ fontFamily: mono, fontSize: '14px', color: INK, textDecoration: 'none' }}>Instagram</a>
            <a href="#contact" style={{ fontFamily: mono, fontSize: '14px', color: INK, textDecoration: 'none' }}>Contact</a>
          </nav>
          <span style={{ fontFamily: mono, fontSize: '13px', color: INK_MID }}>© 2026 QuteNote. Send something real.</span>
        </div>
      </footer>
    </div>
  )
}
