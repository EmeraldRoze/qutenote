import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

const uv = '#5A32D6'

// A real, scannable QR code for adding someone in person — shared by Home
// and Profile so both "QR" entry points open the same sheet.
export default function QRCodeSheet({ username, onClose }: { username: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState('')
  const link = `https://qutenote.com/profile/${username}`

  useEffect(() => {
    QRCode.toDataURL(link, { width: 480, margin: 1, color: { dark: '#231A3A', light: '#FFFFFF' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(''))
  }, [link])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,34,56,0.45)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '16px 16px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, marginBottom: '10px' }}>Add in person</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-mid)', marginBottom: '16px' }}>
          Have them scan this with their camera.
        </p>
        {dataUrl ? (
          <img src={dataUrl} alt="Your QuteNote QR code" style={{
            width: '220px', height: '220px', margin: '0 auto 16px', display: 'block',
            borderRadius: '16px', border: '1px solid var(--stone)', padding: '12px', background: '#fff',
          }} />
        ) : (
          <div style={{ width: '220px', height: '220px', margin: '0 auto 16px', borderRadius: '16px', background: 'var(--lavender-pale)' }} />
        )}
        <button onClick={() => { navigator.clipboard?.writeText(link); onClose() }} style={{
          width: '100%', height: '48px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: uv, color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>Copy link instead</button>
      </div>
    </div>
  )
}
