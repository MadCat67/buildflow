import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'
import { milestones } from '../db/cashflowSchema.js'
import { inboxMessages, messageContacts } from '../db/messagesSchema.js'
import {
  buildDraftContext,
  generateMessageDraft,
} from './aiDraft.js'

const SERVER_URL = (process.env.SERVER_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
)

type DemoSeedMessage = {
  channel: 'email' | 'sms'
  clientName: string
  body: string
  subject?: string
  daysAgo: number
  status: 'pending' | 'approved' | 'sent'
  externalId: string
}

const DEMO_SEED_MESSAGES: DemoSeedMessage[] = [
  {
    channel: 'email',
    clientName: 'Sarah Johnson',
    body: 'Hi — when will the kitchen renovation be finished? We have family visiting mid-August and want to plan around it.',
    subject: 'Kitchen timeline question',
    daysAgo: 0,
    status: 'pending',
    externalId: 'demo-seed-1',
  },
  {
    channel: 'sms',
    clientName: 'Sarah Johnson',
    body: 'Can you send me the updated invoice for the framing milestone? Need it for our records.',
    daysAgo: 1,
    status: 'pending',
    externalId: 'demo-seed-2',
  },
  {
    channel: 'email',
    clientName: 'Mike & Lisa Chen',
    body: 'What time will the crew arrive tomorrow? We need to make sure someone is home to let them in.',
    subject: 'Crew arrival time',
    daysAgo: 1,
    status: 'pending',
    externalId: 'demo-seed-3',
  },
  {
    channel: 'sms',
    clientName: 'David Park',
    body: 'Looks great so far! Quick question — are we still on budget for materials?',
    daysAgo: 3,
    status: 'sent',
    externalId: 'demo-seed-4',
  },
  {
    channel: 'email',
    clientName: 'Sarah Johnson',
    body: 'Thanks for the update last week — really appreciate the transparency on the timeline.',
    subject: 'Re: Project update',
    daysAgo: 7,
    status: 'approved',
    externalId: 'demo-seed-5',
  },
]

function daysAgoDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return digits.length > 0 ? `+${digits}` : null
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null
}

export async function ensureMessageContact(userId: string) {
  const [existing] = await db
    .select()
    .from(messageContacts)
    .where(eq(messageContacts.userId, userId))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(messageContacts)
    .values({ userId })
    .returning()

  return created
}

export async function findProjectForSender(
  userId: string,
  senderEmail: string | null,
  senderPhone: string | null,
  clientNameHint?: string | null,
) {
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))

  const email = normalizeEmail(senderEmail)
  const phone = normalizePhone(senderPhone)

  if (email) {
    const match = userProjects.find(
      (p) => normalizeEmail(p.clientEmail) === email,
    )
    if (match) return match
  }

  if (phone) {
    const match = userProjects.find(
      (p) => normalizePhone(p.clientPhone) === phone,
    )
    if (match) return match
  }

  if (clientNameHint) {
    const hint = clientNameHint.toLowerCase()
    const match = userProjects.find((p) => {
      const name = p.clientName.toLowerCase()
      return name.includes(hint) || hint.includes(name.split(' ')[0])
    })
    if (match) return match
  }

  return userProjects.find((p) => p.isDemo) ?? userProjects[0] ?? null
}

async function createInboxMessageWithDraft(input: {
  userId: string
  projectId: string | null
  externalId: string | null
  channel: 'email' | 'sms'
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  senderAddress: string | null
  subject: string | null
  body: string
  status: 'pending' | 'approved' | 'sent'
  receivedAt: Date
  companyName?: string | null
}) {
  const project = input.projectId
    ? (
        await db
          .select()
          .from(projects)
          .where(eq(projects.id, input.projectId))
          .limit(1)
      )[0] ?? null
    : null

  const milestoneRows = input.projectId
    ? await db
        .select()
        .from(milestones)
        .where(eq(milestones.projectId, input.projectId))
    : []

  const draft = await generateMessageDraft(
    buildDraftContext(
      input.channel,
      input.clientName,
      project,
      input.body,
      input.companyName ?? null,
      milestoneRows,
    ),
  )

  if (input.externalId) {
    const [dup] = await db
      .select({ id: inboxMessages.id })
      .from(inboxMessages)
      .where(
        and(
          eq(inboxMessages.userId, input.userId),
          eq(inboxMessages.externalId, input.externalId),
        ),
      )
      .limit(1)
    if (dup) return null
  }

  const [created] = await db
    .insert(inboxMessages)
    .values({
      userId: input.userId,
      projectId: input.projectId,
      externalId: input.externalId,
      channel: input.channel,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      senderAddress: input.senderAddress,
      subject: input.subject,
      body: input.body,
      status: input.status,
      aiDraft: draft,
      draftBody: draft,
      receivedAt: input.receivedAt,
      sentAt: input.status === 'sent' ? input.receivedAt : null,
    })
    .returning()

  return created ?? null
}

export async function seedDemoInboxIfEmpty(userId: string, companyName?: string | null) {
  const [existing] = await db
    .select({ id: inboxMessages.id })
    .from(inboxMessages)
    .where(eq(inboxMessages.userId, userId))
    .limit(1)

  if (existing) return { seeded: 0 }

  const demoProject = (
    await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.isDemo, true)))
      .limit(1)
  )[0]

  let seeded = 0
  for (const msg of DEMO_SEED_MESSAGES) {
    const created = await createInboxMessageWithDraft({
      userId,
      projectId: demoProject?.id ?? null,
      externalId: msg.externalId,
      channel: msg.channel,
      clientName: msg.clientName,
      clientEmail: demoProject?.clientEmail ?? null,
      clientPhone: demoProject?.clientPhone ?? null,
      senderAddress:
        msg.channel === 'email'
          ? demoProject?.clientEmail ?? null
          : demoProject?.clientPhone ?? null,
      subject: msg.subject ?? null,
      body: msg.body,
      status: msg.status,
      receivedAt: daysAgoDate(msg.daysAgo),
      companyName,
    })
    if (created) seeded++
  }

  return { seeded }
}

export async function ingestTwilioSms(input: {
  from: string
  to: string
  body: string
  messageSid: string
}) {
  const toPhone = normalizePhone(input.to)
  if (!toPhone) return { ingested: false, reason: 'invalid_to' }

  const contacts = await db.select().from(messageContacts)
  const matchContact = contacts.find(
    (c) => normalizePhone(c.contactPhone) === toPhone,
  )

  if (!matchContact) {
    return { ingested: false, reason: 'no_user_for_number' }
  }

  const [dup] = await db
    .select()
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.userId, matchContact.userId),
        eq(inboxMessages.externalId, input.messageSid),
      ),
    )
    .limit(1)

  if (dup) return { ingested: false, reason: 'duplicate' }

  const project = await findProjectForSender(
    matchContact.userId,
    null,
    input.from,
  )

  const created = await createInboxMessageWithDraft({
    userId: matchContact.userId,
    projectId: project?.id ?? null,
    externalId: input.messageSid,
    channel: 'sms',
    clientName: project?.clientName ?? input.from,
    clientEmail: project?.clientEmail ?? null,
    clientPhone: normalizePhone(input.from),
    senderAddress: input.from,
    subject: null,
    body: input.body,
    status: 'pending',
    receivedAt: new Date(),
  })

  return { ingested: !!created, messageId: created?.id }
}

async function refreshGmailToken(contact: typeof messageContacts.$inferSelect) {
  if (!contact.gmailRefreshToken) return contact

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: contact.gmailRefreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return contact

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000)
  const [updated] = await db
    .update(messageContacts)
    .set({
      gmailAccessToken: data.access_token,
      gmailExpiresAt: expiresAt,
      gmailStatus: 'connected',
      updatedAt: new Date(),
    })
    .where(eq(messageContacts.userId, contact.userId))
    .returning()

  return updated
}

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf8')
}

function extractEmailBody(payload: {
  mimeType?: string
  body?: { data?: string }
  parts?: { mimeType?: string; body?: { data?: string } }[]
}): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractEmailBody(part)
      if (text) return text
    }
  }

  return ''
}

export async function syncGmailInbox(userId: string) {
  const contact = await ensureMessageContact(userId)

  if (contact.gmailStatus !== 'connected' || !contact.gmailAccessToken) {
    return { synced: 0, reason: 'gmail_not_connected' }
  }

  let activeContact = contact
  if (
    contact.gmailExpiresAt &&
    contact.gmailExpiresAt.getTime() < Date.now() + 60_000
  ) {
    activeContact = await refreshGmailToken(contact)
  }

  const accessToken = activeContact.gmailAccessToken
  if (!accessToken) return { synced: 0, reason: 'no_token' }

  const contactEmail = activeContact.contactEmail
  const query = contactEmail
    ? `to:${contactEmail} newer_than:30d`
    : 'newer_than:30d'

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!listRes.ok) {
    return { synced: 0, reason: 'gmail_api_error' }
  }

  const listData = (await listRes.json()) as {
    messages?: { id: string }[]
  }

  let synced = 0
  for (const item of listData.messages ?? []) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!msgRes.ok) continue

    const msgData = (await msgRes.json()) as {
      id: string
      payload?: {
        headers?: { name: string; value: string }[]
        body?: { data?: string }
        parts?: { mimeType?: string; body?: { data?: string } }[]
      }
    }

    const headers = msgData.payload?.headers ?? []
    const from =
      headers.find((h) => h.name.toLowerCase() === 'from')?.value ?? ''
    const subject =
      headers.find((h) => h.name.toLowerCase() === 'subject')?.value ?? null

    const emailMatch = from.match(/<([^>]+)>/) ?? from.match(/([\w.+-]+@[\w.-]+)/)
    const senderEmail = emailMatch ? emailMatch[1] ?? emailMatch[0] : from
    const nameMatch = from.match(/^([^<]+)</)
    const senderName = nameMatch
      ? nameMatch[1].trim().replace(/"/g, '')
      : senderEmail

    const body = extractEmailBody(msgData.payload ?? {}).trim()
    if (!body) continue

    const project = await findProjectForSender(userId, senderEmail, null, senderName)

    const created = await createInboxMessageWithDraft({
      userId,
      projectId: project?.id ?? null,
      externalId: `gmail-${msgData.id}`,
      channel: 'email',
      clientName: project?.clientName ?? senderName,
      clientEmail: senderEmail,
      clientPhone: project?.clientPhone ?? null,
      senderAddress: senderEmail,
      subject,
      body,
      status: 'pending',
      receivedAt: new Date(),
    })

    if (created) synced++
  }

  await db
    .update(messageContacts)
    .set({ lastGmailSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(messageContacts.userId, userId))

  return { synced }
}

export async function syncUserInbox(userId: string, companyName?: string | null) {
  const seedResult = await seedDemoInboxIfEmpty(userId, companyName)
  const gmailResult = await syncGmailInbox(userId)
  return {
    seeded: seedResult.seeded,
    gmailSynced: gmailResult.synced,
    gmailConnected: gmailResult.reason !== 'gmail_not_connected',
  }
}

export function getGmailOAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const redirectUri = `${SERVER_URL}/api/messages/oauth/gmail/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function connectGmailFromCode(userId: string, code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${SERVER_URL}/api/messages/oauth/gmail/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    throw new Error('Failed to exchange Gmail OAuth code')
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  await ensureMessageContact(userId)

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
  const updates: Partial<typeof messageContacts.$inferInsert> = {
    gmailAccessToken: tokens.access_token,
    gmailExpiresAt: expiresAt,
    gmailStatus: 'connected',
    updatedAt: new Date(),
  }
  if (tokens.refresh_token) {
    updates.gmailRefreshToken = tokens.refresh_token
  }

  await db
    .update(messageContacts)
    .set(updates)
    .where(eq(messageContacts.userId, userId))

  return { connected: true }
}

export async function regenerateDraftForMessage(
  messageId: string,
  userId: string,
  companyName?: string | null,
) {
  const [msg] = await db
    .select()
    .from(inboxMessages)
    .where(and(eq(inboxMessages.id, messageId), eq(inboxMessages.userId, userId)))
    .limit(1)

  if (!msg) return null

  const project = msg.projectId
    ? (
        await db
          .select()
          .from(projects)
          .where(eq(projects.id, msg.projectId))
          .limit(1)
      )[0] ?? null
    : null

  const milestoneRows = msg.projectId
    ? await db
        .select()
        .from(milestones)
        .where(eq(milestones.projectId, msg.projectId))
    : []

  const draft = await generateMessageDraft(
    buildDraftContext(
      msg.channel as 'email' | 'sms',
      msg.clientName,
      project,
      msg.body,
      companyName ?? null,
      milestoneRows,
    ),
  )

  const [updated] = await db
    .update(inboxMessages)
    .set({
      aiDraft: draft,
      draftBody: draft,
      updatedAt: new Date(),
    })
    .where(eq(inboxMessages.id, messageId))
    .returning()

  return updated
}

export async function listInboxMessages(userId: string) {
  return db
    .select()
    .from(inboxMessages)
    .where(eq(inboxMessages.userId, userId))
    .orderBy(desc(inboxMessages.receivedAt))
}

export function formatReceivedAt(date: Date) {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Yesterday, ${time}`
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' }) + `, ${time}`
  }
  if (diffDays < 14) return 'Last week'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export async function getScheduleMessagesForUser(userId: string) {
  return db
    .select()
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.userId, userId),
        isNull(inboxMessages.sentAt),
      ),
    )
    .orderBy(desc(inboxMessages.receivedAt))
}
