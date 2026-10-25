import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// A real, scannable QR code for adding someone in person — shared by Home
// and Profile so both "QR" entry points open the same sheet.
export default function QRCodeSheet({ username, onClose }: { username: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState('')
  const link = `https://qutenote.com/profile/${username}`

  useEffect(() => {
    QRCode.toDataURL(link, { width: 480, margin: 1, color: { dark: '#4A2424', light: '#FBF8F3' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(''))
  }, [link])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(74,36,36,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 300, marginBottom: '10px', color: 'var(--ink)' }}>Add in person</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', marginBottom: '16px' }}>
          Have them scan this with their camera.
        </p>
        {dataUrl ? (
          <img src={dataUrl} alt="Your QuteNote QR code" style={{
            width: '220px', height: '220px', margin: '0 auto 16px', display: 'block',
            borderRadius: '16px', border: '1.5px solid var(--outline)', padding: '12px', background: 'var(--card)',
          }} />
        ) : (
          <div style={{ width: '220px', height: '220px', margin: '0 auto 16px', borderRadius: '16px', background: 'var(--selected-fill)' }} />
        )}
        <button onClick={() => { navigator.clipboard?.writeText(link); onClose() }} style={{
          width: '100%', height: '56px', borderRadius: '28px', border: '2px solid var(--outline)', cursor: 'pointer',
          background: 'var(--btn)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>Copy link instead</button>
      </div>
    </div>
  )
}
