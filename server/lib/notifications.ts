import nodemailer from 'nodemailer'
import twilio from 'twilio'
import {
  buildReminderMessage,
  resolveReminderTone,
  shouldSendReminder,
  type ReminderTone,
} from './reminderTemplates.js'

export type PaymentRequestPayload = {
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  projectName: string
  projectId?: string
  milestoneId?: string
  stageName: string
  amount: number
  dueDate: string | null
  channels: ('email' | 'sms')[]
  tone?: ReminderTone
  paymentLink?: string
  daysUntilDue?: number | null
}

type SendResult = {
  emailSent: boolean
  smsSent: boolean
  errors: string[]
  messagePreview?: string
}

function formatMoney(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function buildPaymentLink(projectId: string, milestoneId: string) {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(
    /\/$/,
    '',
  )
  return `${clientUrl}/pay/${projectId}/${milestoneId}`
}

async function sendEmail(
  payload: PaymentRequestPayload,
  subject: string,
  body: string,
): Promise<void> {
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

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to: payload.clientEmail,
    subject,
    text: body,
  })
}

async function sendSms(payload: PaymentRequestPayload, body: string): Promise<void> {
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
  await client.messages.create({
    from,
    to: payload.clientPhone,
    body,
  })
}

export async function sendPaymentRequest(
  payload: PaymentRequestPayload,
): Promise<SendResult> {
  const tone = payload.tone ?? 'gentle'
  const paymentLink =
    payload.paymentLink ??
    (payload.projectId && payload.milestoneId
      ? buildPaymentLink(payload.projectId, payload.milestoneId)
      : '')

  const templates = buildReminderMessage(tone, {
    clientName: payload.clientName,
    projectName: payload.projectName,
    stageName: payload.stageName,
    amount: payload.amount,
    dueDate: payload.dueDate,
    paymentLink,
    daysUntilDue: payload.daysUntilDue ?? null,
  })

  const result: SendResult = {
    emailSent: false,
    smsSent: false,
    errors: [],
    messagePreview: templates.smsBody.slice(0, 160),
  }

  if (payload.channels.includes('email')) {
    try {
      await sendEmail(payload, templates.emailSubject, templates.emailBody)
      result.emailSent = true
      result.messagePreview = templates.emailBody.slice(0, 200)
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'Email failed')
    }
  }

  if (payload.channels.includes('sms')) {
    try {
      await sendSms(payload, templates.smsBody)
      result.smsSent = true
      if (!result.emailSent) {
        result.messagePreview = templates.smsBody
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'SMS failed')
    }
  }

  if (!result.emailSent && !result.smsSent) {
    throw new Error(result.errors.join(' · ') || 'No messages were sent')
  }

  return result
}

export { buildPaymentLink, resolveReminderTone, shouldSendReminder }
