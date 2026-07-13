import nodemailer from 'nodemailer'
import twilio from 'twilio'

export type ClientReplyPayload = {
  channel: 'email' | 'sms'
  clientEmail: string | null
  clientPhone: string | null
  clientName: string
  subject?: string | null
  body: string
}

export async function sendClientReply(
  payload: ClientReplyPayload,
): Promise<{ emailSent: boolean; smsSent: boolean; errors: string[] }> {
  const result = { emailSent: false, smsSent: false, errors: [] as string[] }

  if (payload.channel === 'email') {
    try {
      await sendReplyEmail(payload)
      result.emailSent = true
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'Email failed')
    }
  }

  if (payload.channel === 'sms') {
    try {
      await sendReplySms(payload)
      result.smsSent = true
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'SMS failed')
    }
  }

  if (!result.emailSent && !result.smsSent) {
    throw new Error(result.errors.join(' · ') || 'No messages were sent')
  }

  return result
}

async function sendReplyEmail(payload: ClientReplyPayload): Promise<void> {
  if (!payload.clientEmail) {
    throw new Error('Client email is not available for this message')
  }

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error(
      'Email is not configured. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env',
    )
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  })

  const subject =
    payload.subject?.trim() ||
    `Re: ${payload.clientName} — project update`

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to: payload.clientEmail,
    subject,
    text: payload.body,
  })
}

async function sendReplySms(payload: ClientReplyPayload): Promise<void> {
  if (!payload.clientPhone) {
    throw new Error('Client phone is not available for this message')
  }

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    throw new Error(
      'SMS is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to .env',
    )
  }

  const client = twilio(sid, token)
  await client.messages.create({
    from,
    to: payload.clientPhone,
    body: payload.body,
  })
}
