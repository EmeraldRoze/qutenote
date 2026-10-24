// Landing page after the $7.95 extra-card Stripe checkout. Opens in the
// browser (outside the app), so it just confirms and points back.
export default function ExtraCardSuccessPage() {
  const cancelled = new URLSearchParams(window.location.search).has('cancelled')
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '380px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', lineHeight: 1 }}>{cancelled ? '💭' : '💌'}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '28px', color: 'var(--ink)', margin: '18px 0 10px' }}>
          {cancelled ? 'No worries.' : 'Extra card added!'}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-mid)', lineHeight: 1.5, margin: 0 }}>
          {cancelled
            ? 'Nothing was charged. Head back to the QuteNote app whenever you like.'
            : 'Head back to the QuteNote app — your card is ready to mail.'}
        </p>
      </div>
    </div>
  )
}
