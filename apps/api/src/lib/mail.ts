// One place that sends email.
//
// Emerald, Oct 26: password resets had never worked in production. The code
// only knew how to send through Resend, the server only had a SendGrid key,
// so the app quietly created a reset token and sent nothing — five requests
// going back to April, all unused. This sends through whichever service is
// actually configured, preferring SendGrid since that is the one she pays
// for, and it SAYS SO IN THE LOG when it cannot send, instead of failing in
// silence.

const FROM = process.env.RESEND_FROM_EMAIL ?? process.env.SENDGRID_FROM_EMAIL ?? 'hello@qutenote.com'
const FROM_NAME = 'QuteNote'

export interface Mail {
  to: string
  subject: string
  html: string
}

export function mailIsConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY)
}

export async function sendEmail(mail: Mail): Promise<{ sent: boolean; error?: string }> {
  // Resend first (Emerald, Oct 29): the SendGrid account is out of credits, so
  // preferring it meant every send picked the dead service. SendGrid stays as
  // a fallback in case Resend is ever down.
  if (process.env.RESEND_API_KEY) return sendWithResend(mail)
  if (process.env.SENDGRID_API_KEY) return sendWithSendGrid(mail)
  console.error('[mail] NOT SENT — no SENDGRID_API_KEY or RESEND_API_KEY is set:', mail.subject, '→', mail.to)
  return { sent: false, error: 'no email service configured' }
}

async function sendWithSendGrid({ to, subject, html }: Mail): Promise<{ sent: boolean; error?: string }> {
  try {
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    })
    if (r.status === 202) return { sent: true }
    const body = await r.text()
    // The usual cause of a 403 here is the From address not being verified
    // in SendGrid. Say that plainly rather than leaving a bare status code.
    console.error(`[mail] SendGrid refused (${r.status}) sending "${subject}" from ${FROM}:`, body.slice(0, 300))
    return { sent: false, error: `sendgrid ${r.status}` }
  } catch (err: any) {
    console.error('[mail] SendGrid threw:', err?.message ?? err)
    return { sent: false, error: err?.message ?? 'unknown' }
  }
}

async function sendWithResend({ to, subject, html }: Mail): Promise<{ sent: boolean; error?: string }> {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, from: `${FROM_NAME} <${FROM}>`, subject, html }),
    })
    if (r.ok) return { sent: true }
    const body = await r.text()
    console.error(`[mail] Resend refused (${r.status}):`, body.slice(0, 300))
    return { sent: false, error: `resend ${r.status}` }
  } catch (err: any) {
    console.error('[mail] Resend threw:', err?.message ?? err)
    return { sent: false, error: err?.message ?? 'unknown' }
  }
}
