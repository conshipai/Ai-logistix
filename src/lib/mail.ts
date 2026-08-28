import { env, isProduction } from '@/lib/env'

/**
 * Outbound email.
 *
 * SMTP is optional. When it is not configured the transport degrades to a
 * logger: notifications are still persisted in the database and written to
 * stdout, so the workflow is fully exercisable before a mail relay exists.
 */

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

export interface MailResult {
  delivered: boolean
  skipped: boolean
  error?: string
}

export function isMailConfigured(): boolean {
  const c = env()
  return Boolean(c.SMTP_HOST && c.SMTP_PORT && c.EMAIL_FROM)
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = env()

  if (!isMailConfigured()) {
    console.info(
      `[mail:disabled] would send to=${message.to} subject="${message.subject}"\n${message.text}`,
    )
    return { delivered: false, skipped: true }
  }

  try {
    const nodemailer = await import('nodemailer')
    const transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE ?? config.SMTP_PORT === 465,
      auth:
        config.SMTP_USER && config.SMTP_PASSWORD
          ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
          : undefined,
    })
    await transport.sendMail({
      from: config.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html ?? undefined,
    })
    return { delivered: true, skipped: false }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[mail] delivery failed', detail)
    if (!isProduction()) console.info(`[mail:failed-body] ${message.subject}\n${message.text}`)
    return { delivered: false, skipped: false, error: detail }
  }
}

/** Minimal, plain HTML wrapper. Institutional, no images, no tracking. */
export function emailLayout(heading: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string): string {
  const cta = ctaUrl
    ? `<p style="margin:28px 0"><a href="${ctaUrl}" style="background:#101b30;color:#fff;padding:12px 22px;border-radius:4px;text-decoration:none;font-weight:600;display:inline-block">${ctaLabel ?? 'Open MConnect'}</a></p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#f2f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#243250">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#476296;font-weight:700">MConnect</div>
  <div style="font-size:11px;color:#6883b0;margin-top:2px">Powered by AI Logistix</div>
  <div style="background:#fff;border:1px solid #e3e9f2;border-radius:8px;padding:28px;margin-top:18px">
    <h1 style="font-size:19px;margin:0 0 14px;color:#101b30">${heading}</h1>
    ${bodyHtml}
    ${cta}
  </div>
  <p style="font-size:11px;color:#6883b0;line-height:1.6;margin-top:18px">
    MConnect is a supply-chain coordination and transaction-management platform. Financing
    availability is subject to independent review and approval by participating financial
    institutions. Submission of a purchase order or financing request does not constitute an
    offer or commitment to provide financing.
  </p>
</div></body></html>`
}
