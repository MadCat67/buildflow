import nodemailer from 'nodemailer'
import twilio from 'twilio'

type PaymentRequestPayload = {
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  projectName: string
  stageName: string
  amount: number
  dueDate: string | null
  channels: ('email' | 'sms')[]
}

type SendResult = {
  emailSent: boolean
  smsSent: boolean
  errors: string[]
}

function formatMoney(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

async function sendEmail(payload: PaymentRequestPayload): Promise<void> {
  if (!payload.clientEmail) {
    throw new Error('Client email is not set on this project')
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

  const dueLine = payload.dueDate
    ? `Payment was due on ${payload.dueDate}.`
    : 'Please arrange payment at your earliest convenience.'

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to: payload.clientEmail,
    subject: `Payment reminder: ${payload.stageName} — ${payload.projectName}`,
    text: [
      `Hi ${payload.clientName},`,
      '',
      `This is a friendly reminder regarding your milestone payment for ${payload.projectName}.`,
      '',
      `Milestone: ${payload.stageName}`,
      `Amount due: ${formatMoney(payload.amount)}`,
      dueLine,
      '',
      'Thank you,',
      'BuildFlow',
    ].join('\n'),
  })
}

async function sendSms(payload: PaymentRequestPayload): Promise<void> {
  if (!payload.clientPhone) {
    throw new Error('Client phone number is not set on this project')
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
  const dueLine = payload.dueDate ? ` Due: ${payload.dueDate}.` : ''

  await client.messages.create({
    from,
    to: payload.clientPhone,
    body: `BuildFlow payment reminder for ${payload.projectName}: ${payload.stageName} — ${formatMoney(payload.amount)}.${dueLine} Reply if you have questions.`,
  })
}

export async function sendPaymentRequest(
  payload: PaymentRequestPayload,
): Promise<SendResult> {
  const result: SendResult = {
    emailSent: false,
    smsSent: false,
    errors: [],
  }

  if (payload.channels.includes('email')) {
    try {
      await sendEmail(payload)
      result.emailSent = true
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'Email failed')
    }
  }

  if (payload.channels.includes('sms')) {
    try {
      await sendSms(payload)
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
