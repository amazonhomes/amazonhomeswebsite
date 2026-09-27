import 'server-only'

type LeadType = 'inquiry' | 'offer' | 'showing'

type LeadEmailPayload = {
  type: LeadType
  name: string
  email: string
  phone?: string | null
  company?: string | null
  propertyAddress?: string | null
  offerAmount?: number | null
  preferredTime?: string | null
  message?: string | null
  submittedAt?: string | Date | null
}

type Row = {
  label: string
  value: string
}

const CHARCOAL = '#27272a'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const GREEN = '#228653'
const LIGHT_GREEN = '#ecfdf3'
const LIGHT_GRAY = '#f6f7f8'

function getResendApiKey() {
  return process.env.RESEND_API_KEY
}

function getNotificationRecipient() {
  return process.env.LEAD_NOTIFICATION_EMAIL
}

function getFromAddress() {
  return (
    process.env.LEAD_NOTIFICATION_FROM ||
    'Amazon Homes <onboarding@resend.dev>'
  )
}

function escapeHtml(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ''

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return 'Not provided'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTimestamp(value?: string | Date | null) {
  const date = value ? new Date(value) : new Date()

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Detroit',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })

    return formatter.format(date)
  } catch {
    return date.toISOString()
  }
}

function getAdminSection(type: LeadType) {
  switch (type) {
    case 'offer':
      return 'offers'
    case 'showing':
      return 'showings'
    case 'inquiry':
    default:
      return 'messages'
  }
}

function getBadgeLabel(type: LeadType) {
  switch (type) {
    case 'offer':
      return 'NEW OFFER'
    case 'showing':
      return 'NEW SHOWING REQUEST'
    case 'inquiry':
    default:
      return 'NEW PROPERTY INQUIRY'
  }
}

function getTitle(type: LeadType) {
  switch (type) {
    case 'offer':
      return 'New Property Offer'
    case 'showing':
      return 'New Showing Request'
    case 'inquiry':
    default:
      return 'New Property Inquiry'
  }
}

function getIntro(type: LeadType) {
  switch (type) {
    case 'offer':
      return 'A new offer was submitted through the Amazon Homes website.'
    case 'showing':
      return 'A new showing request was submitted through the Amazon Homes website.'
    case 'inquiry':
    default:
      return 'A new inquiry was submitted through the Amazon Homes website.'
  }
}

function getSubject(type: LeadType, name: string) {
  switch (type) {
    case 'offer':
      return `New offer · ${name}`
    case 'showing':
      return `New showing request · ${name}`
    case 'inquiry':
    default:
      return `New inquiry · ${name}`
  }
}

function getMessageLabel(type: LeadType) {
  switch (type) {
    case 'offer':
      return 'MESSAGE / NOTES'
    case 'showing':
      return 'MESSAGE / NOTES'
    case 'inquiry':
    default:
      return 'MESSAGE'
  }
}

function getCtaLabel(type: LeadType) {
  switch (type) {
    case 'offer':
      return 'Review Offer'
    case 'showing':
      return 'Review Showing Request'
    case 'inquiry':
    default:
      return 'View Inquiry'
  }
}

function renderEmailHtml(opts: {
  type: LeadType
  title: string
  intro: string
  rows: Row[]
  messageLabel: string
  messageHtml: string
  submittedAt: string
  ctaUrl: string
}) {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://amazonhomes.com'
  ).replace(/\/$/, '')

  const logoUrl = `${siteUrl}/logo1.png`

  const rowsHtml = opts.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid ${BORDER};">
            <div style="
              font-size:11px;
              font-weight:600;
              letter-spacing:0.06em;
              color:${MUTED};
              text-transform:uppercase;
            ">
              ${escapeHtml(row.label)}
            </div>

            <div style="
              margin-top:4px;
              font-size:15px;
              color:${CHARCOAL};
              word-break:break-word;
            ">
              ${row.value}
            </div>
          </td>
        </tr>
      `,
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#f3f4f6;
  font-family:Arial,Helvetica,sans-serif;
  color:${CHARCOAL};
">

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="background-color:#f3f4f6;"
  >
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            max-width:620px;
            background:#ffffff;
            border:1px solid ${BORDER};
            border-radius:12px;
            overflow:hidden;
          "
        >

          <!-- HEADER -->
          <tr>
            <td style="
              padding:24px 32px 20px 32px;
              border-bottom:1px solid ${BORDER};
            ">

              <img
                src="${logoUrl}"
                alt="Amazon Homes"
                width="170"
                style="
                  display:block;
                  width:170px;
                  max-width:100%;
                  height:auto;
                  border:0;
                  outline:none;
                  text-decoration:none;
                "
              />

              <div style="
                margin-top:8px;
                font-size:13px;
                color:${MUTED};
              ">
                Metro Detroit Investment Deals
              </div>

            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:28px 32px;">

              <!-- BADGE -->
              <div style="
                display:inline-block;
                padding:7px 12px;
                border-radius:999px;
                background:${GREEN};
                color:#ffffff;
                font-size:11px;
                line-height:1;
                font-weight:700;
                letter-spacing:0.04em;
              ">
                ${escapeHtml(getBadgeLabel(opts.type))}
              </div>

              <!-- TITLE -->
              <h1 style="
                margin:20px 0 8px 0;
                font-size:21px;
                line-height:1.3;
                color:${CHARCOAL};
              ">
                ${escapeHtml(opts.title)}
              </h1>

              <!-- INTRO -->
              <p style="
                margin:0 0 20px 0;
                font-size:14px;
                line-height:1.6;
                color:${MUTED};
              ">
                ${escapeHtml(opts.intro)}
              </p>

              <!-- DETAILS -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                ${rowsHtml}
              </table>

              <!-- MESSAGE -->
              <div style="margin-top:22px;">

                <div style="
                  margin-bottom:8px;
                  font-size:11px;
                  font-weight:600;
                  letter-spacing:0.06em;
                  color:${MUTED};
                  text-transform:uppercase;
                ">
                  ${escapeHtml(opts.messageLabel)}
                </div>

                <div style="
                  padding:16px;
                  border-radius:9px;
                  background:${LIGHT_GRAY};
                  font-size:14px;
                  line-height:1.6;
                  color:${CHARCOAL};
                  word-break:break-word;
                ">
                  ${opts.messageHtml || 'Not provided'}
                </div>

              </div>

              <!-- SUBMITTED -->
              <div style="margin-top:18px;">

                <div style="
                  font-size:11px;
                  font-weight:600;
                  letter-spacing:0.06em;
                  color:${MUTED};
                  text-transform:uppercase;
                ">
                  SUBMITTED
                </div>

                <div style="
                  margin-top:5px;
                  font-size:14px;
                  color:${CHARCOAL};
                ">
                  ${escapeHtml(opts.submittedAt)}
                </div>

              </div>

              <!-- CTA -->
              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-top:28px;"
              >
                <tr>
                  <td
                    align="center"
                    bgcolor="${GREEN}"
                    style="border-radius:8px;"
                  >
                    <a
                      href="${escapeHtml(opts.ctaUrl)}"
                      style="
                        display:inline-block;
                        padding:13px 22px;
                        font-size:14px;
                        font-weight:700;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:8px;
                      "
                    >
                      ${escapeHtml(getCtaLabel(opts.type))}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="
              padding:22px 32px;
              border-top:1px solid ${BORDER};
              background:#ffffff;
            ">

              <div style="
                font-size:12px;
                line-height:1.6;
                color:${MUTED};
              ">
                Amazon Homes · Metro Detroit Investment Deals
              </div>

              <div style="
                margin-top:4px;
                font-size:11px;
                line-height:1.6;
                color:${MUTED};
              ">
                This is an automated notification from the Amazon Homes Investor Portal.
              </div>

              <div style="
                font-size:11px;
                line-height:1.6;
                color:${MUTED};
              ">
                Please do not share this email if it contains private lead information.
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `
}

function renderPlainText(payload: LeadEmailPayload) {
  const lines: string[] = []

  lines.push('AMAZON HOMES')
  lines.push('Metro Detroit Investment Deals')
  lines.push('')
  lines.push(getTitle(payload.type))
  lines.push('')
  lines.push(`Name: ${payload.name}`)
  lines.push(`Email: ${payload.email}`)

  if (payload.phone) {
    lines.push(`Phone: ${payload.phone}`)
  }

  if (payload.company) {
    lines.push(`Company: ${payload.company}`)
  }

  if (payload.propertyAddress) {
    lines.push(`Property: ${payload.propertyAddress}`)
  }

  if (payload.type === 'offer') {
    lines.push(`Offer amount: ${formatCurrency(payload.offerAmount)}`)
  }

  if (payload.preferredTime) {
    lines.push(`Preferred time: ${payload.preferredTime}`)
  }

  lines.push('')
  lines.push(
    `${getMessageLabel(payload.type)}: ${payload.message || 'Not provided'}`,
  )
  lines.push('')
  lines.push(`Submitted: ${formatTimestamp(payload.submittedAt)}`)

  return lines.join('\n')
}

function buildRows(payload: LeadEmailPayload): Row[] {
  const rows: Row[] = [
    {
      label: 'Name',
      value: escapeHtml(payload.name),
    },
    {
      label: 'Email',
      value: `
        <a
          href="mailto:${escapeHtml(payload.email)}"
          style="color:#2563eb;text-decoration:underline;"
        >
          ${escapeHtml(payload.email)}
        </a>
      `,
    },
  ]

  rows.push({
    label: 'Phone',
    value: payload.phone
      ? `
        <a
          href="tel:${escapeHtml(payload.phone)}"
          style="color:#2563eb;text-decoration:underline;"
        >
          ${escapeHtml(payload.phone)}
        </a>
      `
      : 'Not provided',
  })

  rows.push({
    label: 'Company',
    value: payload.company
      ? escapeHtml(payload.company)
      : 'Not provided',
  })

  if (payload.propertyAddress) {
    rows.push({
      label: 'Property',
      value: escapeHtml(payload.propertyAddress),
    })
  }

  if (payload.type === 'offer') {
    rows.push({
      label: 'Offer Amount',
      value: escapeHtml(formatCurrency(payload.offerAmount)),
    })
  }

  if (payload.type === 'showing') {
    rows.push({
      label: 'Preferred Time',
      value: payload.preferredTime
        ? escapeHtml(payload.preferredTime)
        : 'Not provided',
    })
  }

  return rows
}

async function sendEmail(payload: LeadEmailPayload) {
  const apiKey = getResendApiKey()
  const recipient = getNotificationRecipient()

  if (!apiKey) {
    console.error('[lead-email] RESEND_API_KEY is missing.')

    return {
      ok: false,
      delivered: false,
      status: 500,
    }
  }

  if (!recipient) {
    console.error('[lead-email] LEAD_NOTIFICATION_EMAIL is missing.')

    return {
      ok: false,
      delivered: false,
      status: 500,
    }
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://amazonhomes.com'
  ).replace(/\/$/, '')

  const adminSection = getAdminSection(payload.type)
  const ctaUrl = `${siteUrl}/admin?section=${adminSection}`

  const rows = buildRows(payload)

  const messageHtml = payload.message
    ? escapeHtml(payload.message).replace(/\n/g, '<br />')
    : 'Not provided'

  const html = renderEmailHtml({
    type: payload.type,
    title: getTitle(payload.type),
    intro: getIntro(payload.type),
    rows,
    messageLabel: getMessageLabel(payload.type),
    messageHtml,
    submittedAt: formatTimestamp(payload.submittedAt),
    ctaUrl,
  })

  const text = renderPlainText(payload)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [recipient],
        reply_to: payload.email,
        subject: getSubject(payload.type, payload.name),
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()

      console.error(
        '[lead-email] Resend rejected email:',
        response.status,
        errorBody,
      )

      return {
        ok: false,
        delivered: false,
        status: response.status,
      }
    }

    return {
      ok: true,
      delivered: true,
      status: response.status,
    }
  } catch (error) {
    console.error('[lead-email] Failed to send email:', error)

    return {
      ok: false,
      delivered: false,
      status: 500,
    }
  }
}

export async function sendLeadNotification(
  payload: LeadEmailPayload,
) {
  return sendEmail(payload)
}