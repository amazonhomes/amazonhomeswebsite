import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only email delivery for Admin/VA lead notifications (Resend REST API).
 *
 * Required env vars (server-only, never exposed to the browser):
 *   RESEND_API_KEY          – Resend API key
 *   LEAD_NOTIFICATION_EMAIL – Admin/VA inbox that receives lead alerts
 * Optional:
 *   LEAD_NOTIFICATION_FROM  – verified sender, e.g. "Amazon Homes <leads@yourdomain.com>"
 *   NEXT_PUBLIC_SITE_URL    – canonical site URL used for admin links in emails
 *
 * When unconfigured, delivery is skipped (logged) and never throws, so a saved
 * lead is never lost because of an email problem.
 */

export type EmailResult = { ok: boolean; delivered: boolean; status?: number }

export async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !opts.to) {
    console.log(`[email] Delivery disabled (missing RESEND_API_KEY or recipient): ${opts.subject}`)
    return { ok: true, delivered: false }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.LEAD_NOTIFICATION_FROM ?? 'Amazon Homes <onboarding@resend.dev>',
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })
    if (!res.ok) {
      console.log('[email] Resend rejected the message:', res.status, await res.text())
      return { ok: false, delivered: false, status: 502 }
    }
    return { ok: true, delivered: true }
  } catch (err) {
    console.log('[email] Resend request failed:', (err as Error).message)
    return { ok: false, delivered: false, status: 502 }
  }
}

type LeadType = 'offer' | 'showing' | 'inquiry'

const LABEL: Record<LeadType, string> = {
  offer: 'New offer',
  showing: 'New showing request',
  inquiry: 'New inquiry',
}

const BADGE_LABEL: Record<LeadType, string> = {
  offer: 'NEW OFFER RECEIVED',
  showing: 'NEW SHOWING REQUEST',
  inquiry: 'NEW PROPERTY INQUIRY',
}

const CTA_LABEL: Record<LeadType, string> = {
  offer: 'Review Offer',
  showing: 'Review Showing Request',
  inquiry: 'View in Admin Dashboard',
}

const ADMIN_SECTION: Record<LeadType, string> = {
  offer: 'offers',
  showing: 'showings',
  inquiry: 'messages',
}

const BRAND_GREEN = '#1f7a4d'
const CHARCOAL = '#1f2328'
const MUTED = '#5b6169'
const BORDER = '#e5e7eb'
const BG = '#f4f5f6'

/** Escapes user-provided text before it is interpolated into HTML, so a lead
 * cannot inject markup through name/message/company/address fields. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Preserves user line breaks after escaping, for the message/notes block. */
export function escapeHtmlMultiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

function formatTimestamp(date: Date): string {
  // `Date.prototype.toLocaleString` rejects `dateStyle`/`timeStyle` combined
  // with `timeZoneName`, so format the two parts separately and join them.
  const formatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Detroit',
  }).format(date)
  const zone = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value

  return zone ? `${formatted} ${zone}` : formatted
}

type Row = { label: string; value: string }

/** Shared HTML wrapper: brand header, green status badge, title, info rows,
 * message block, CTA button, and footer. Kept as plain, email-client-safe
 * inline-styled HTML — no external CSS, no JavaScript. */
function renderEmailHtml(opts: {
  type: LeadType
  title: string
  intro: string
  rows: Row[]
  messageLabel: string
  messageHtml: string
  submittedAt: string
  ctaUrl: string
}): string {
  const rowsHtml = opts.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid ${BORDER};">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">${escapeHtml(row.label)}</div>
            <div style="margin-top:4px;font-size:15px;color:${CHARCOAL};word-break:break-word;">${row.value}</div>
          </td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
            <tr>
              <td style="padding:28px 32px 20px 32px;border-bottom:1px solid ${BORDER};">
                <div style="font-size:18px;font-weight:700;letter-spacing:0.02em;color:${CHARCOAL};">AMAZON HOMES</div>
                <div style="margin-top:2px;font-size:13px;color:${MUTED};">Metro Detroit Investment Deals</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <span style="display:inline-block;background-color:${BRAND_GREEN};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.06em;padding:6px 12px;border-radius:999px;">${escapeHtml(BADGE_LABEL[opts.type])}</span>
                <div style="margin-top:16px;font-size:20px;font-weight:700;color:${CHARCOAL};">${escapeHtml(opts.title)}</div>
                <div style="margin-top:6px;font-size:14px;color:${MUTED};line-height:1.5;">${escapeHtml(opts.intro)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">${escapeHtml(opts.messageLabel)}</div>
                <div style="margin-top:8px;padding:14px 16px;background-color:${BG};border-radius:8px;font-size:14px;color:${CHARCOAL};line-height:1.6;word-break:break-word;">${opts.messageHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">SUBMITTED</div>
                <div style="margin-top:4px;font-size:14px;color:${CHARCOAL};">${escapeHtml(opts.submittedAt)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <a href="${opts.ctaUrl}" style="display:inline-block;background-color:${BRAND_GREEN};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;">${escapeHtml(CTA_LABEL[opts.type])}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px 32px;border-top:1px solid ${BORDER};margin-top:8px;">
                <div style="font-size:12px;color:${MUTED};line-height:1.6;">
                  Amazon Homes &middot; Metro Detroit Investment Deals<br />
                  This is an automated notification from the Amazon Homes Investor Portal.<br />
                  Please do not share this email if it contains private lead information.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function renderEmailText(opts: {
  heading: string
  rows: Row[]
  messageLabel: string
  messageText: string
  submittedAt: string
  ctaLabel: string
  ctaUrl: string
}): string {
  const lines = [
    `Amazon Homes — ${opts.heading}`,
    '',
    ...opts.rows.map((row) => `${row.label}: ${row.value}`),
    '',
    `${opts.messageLabel}:`,
    opts.messageText,
    '',
    `Submitted: ${opts.submittedAt}`,
    '',
    `${opts.ctaLabel}:`,
    opts.ctaUrl,
  ]
  return lines.join('\n')
}

export async function notifyTeamOfLead(
  supabase: SupabaseClient,
  origin: string,
  lead: {
    type: LeadType
    name: string
    email: string
    phone?: string | null
    company?: string | null
    propertyId?: string | null
    amount?: number
    preferredTime?: string | null
    message?: string | null
  },
): Promise<void> {
  try {
    let property: string | null = null
    if (lead.propertyId) {
      const { data } = await supabase
        .from('properties')
        .select('address, city, state, zip')
        .eq('id', lead.propertyId)
        .maybeSingle()
      property = data
        ? [data.address, data.city, [data.state, data.zip].filter(Boolean).join(' ')]
            .filter(Boolean)
            .join(', ')
        : lead.propertyId
    }

    const base = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '')
    const ctaUrl = `${base}/admin?section=${ADMIN_SECTION[lead.type]}`
    const submittedAt = formatTimestamp(new Date())

    const contactRows: Row[] = [
      { label: 'Name', value: escapeHtml(lead.name) },
      { label: 'Email', value: escapeHtml(lead.email) },
      { label: 'Phone', value: lead.phone ? escapeHtml(lead.phone) : 'Not provided' },
      { label: 'Company', value: lead.company ? escapeHtml(lead.company) : 'Not provided' },
    ]

    let subject: string
    let title: string
    let intro: string
    let rows: Row[]
    let messageLabel: string
    let messageRaw: string

    if (lead.type === 'offer') {
      const formattedAmount = typeof lead.amount === 'number' ? formatCurrency(lead.amount) : ''
      subject = `New Offer · ${property ?? 'Property'} · ${formattedAmount}`.slice(0, 200)
      title = 'New Offer Received'
      intro = 'A new offer was submitted through the Amazon Homes website.'
      rows = [
        { label: 'Property Address', value: property ? escapeHtml(property) : 'Not specified' },
        { label: 'Offer Amount', value: formattedAmount || 'Not specified' },
        ...contactRows,
      ]
      messageLabel = 'MESSAGE / NOTES'
      messageRaw = lead.message || 'No additional notes'
    } else if (lead.type === 'showing') {
      subject = `New Showing Request · ${property ?? 'Property'}`.slice(0, 200)
      title = 'New Showing Request'
      intro = 'A new showing request was submitted through the Amazon Homes website.'
      rows = [
        { label: 'Property Address', value: property ? escapeHtml(property) : 'Not specified' },
        { label: 'Name', value: escapeHtml(lead.name) },
        { label: 'Email', value: escapeHtml(lead.email) },
        { label: 'Phone', value: lead.phone ? escapeHtml(lead.phone) : 'Not provided' },
        { label: 'Preferred Time', value: lead.preferredTime ? escapeHtml(lead.preferredTime) : 'Flexible / Not specified' },
      ]
      messageLabel = 'MESSAGE / NOTES'
      messageRaw = lead.message || 'No additional notes'
    } else {
      subject = `New Inquiry · ${lead.name}`.slice(0, 200)
      title = 'New Property Inquiry'
      intro = 'A new inquiry was submitted through the Amazon Homes website.'
      rows = property ? [{ label: 'Property Address', value: escapeHtml(property) }, ...contactRows] : contactRows
      messageLabel = 'MESSAGE'
      messageRaw = lead.message || ''
    }

    const html = renderEmailHtml({
      type: lead.type,
      title,
      intro,
      rows,
      messageLabel,
      messageHtml: escapeHtmlMultiline(messageRaw),
      submittedAt,
      ctaUrl,
    })

    const text = renderEmailText({
      heading: title,
      rows: rows.map((row) => ({ label: row.label, value: row.value })),
      messageLabel,
      messageText: messageRaw,
      submittedAt,
      ctaLabel: CTA_LABEL[lead.type],
      ctaUrl,
    })

    console.log(`[email] Sending ${LABEL[lead.type]} notification for ${lead.name}`)

    await sendEmail({
      to: process.env.LEAD_NOTIFICATION_EMAIL ?? '',
      subject,
      text,
      html,
      replyTo: lead.email,
    })
  } catch (err) {
    console.log('[email] Lead notification failed:', (err as Error).message)
  }
}
