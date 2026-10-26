import { useNavigate } from 'react-router-dom'
import QEmoji from '../../components/QEmoji'
import QIcon from '../../components/QIcon'

// Application sent (her qutenote-artists package, screen 03).

const col: React.CSSProperties = {
  width: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box',
}

export default function ArtistApplicationSentPage() {
  const navigate = useNavigate()

  const step = (n: string, text: string) => (
    <li key={n} style={{ display: 'flex', gap: '10px', fontSize: '15px', lineHeight: '18px', fontFamily: 'var(--font-body)', marginBottom: '12px' }}>
      <span style={{ fontWeight: 700 }}>{n}.</span>
      <span>{text}</span>
    </li>
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="title-band" style={{ height: '216px', boxSizing: 'border-box', paddingTop: 'max(calc(40px - env(safe-area-inset-top)), 0px)' }}>
        <div style={col}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => navigate('/settings')} aria-label="Back" style={{
              width: '44px', height: '44px', flex: 'none', borderRadius: '50%', background: 'var(--light-blush)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <QIcon name="chevron-left" size={18} />
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}>Step 1 of 3</span>
              <div aria-hidden style={{ display: 'flex', gap: '4px' }}>
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--highlight)' }} />
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--progress-track)' }} />
                <span style={{ width: '28px', height: '5px', borderRadius: '3px', background: 'var(--progress-track)' }} />
              </div>
            </div>
            <span style={{ width: '44px' }} />
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '26px', lineHeight: '36px', letterSpacing: '-0.01em' }}>
              Application sent.
            </h1>
            <QEmoji name="mailbox" size={64} style={{ flex: 'none', height: 'auto', transform: 'rotate(6deg)' }} />
          </div>
        </div>
      </header>

      <div style={{ ...col, marginTop: '18px' }}>
        <div className="qn-stamp" style={{ border: '10px solid transparent', padding: '16px 14px' }}>
          <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700 }}>What happens next</h2>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {step('1', 'We look over your work and your profile.')}
            {step('2', "If you're approved, you'll upload your three cards in full size.")}
            {step('3', 'Connect PayPal and you’ll earn every time someone sends one of your cards.')}
          </ol>
        </div>

        <p className="on-paper" style={{ margin: '18px 0 0', fontSize: '15px', lineHeight: '18px', fontFamily: 'var(--font-body)' }}>
          We'll send you a notification as soon as there's news.
        </p>

        <button
          onClick={() => navigate('/settings')}
          style={{
            marginTop: '22px', width: '100%', height: '56px', borderRadius: '28px', background: 'var(--card)',
            border: '2px solid var(--outline)', boxSizing: 'border-box', cursor: 'pointer',
            color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700,
            letterSpacing: '0.08em', textIndent: '0.08em',
          }}
        >
          BACK TO SETTINGS
        </button>
      </div>
    </div>
  )
}
