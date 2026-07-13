import { Router } from 'express'
import crypto from 'crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects, users } from '../db/schema.js'
import { inboxMessages, messageContacts } from '../db/messagesSchema.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { sendClientReply } from '../lib/clientMessaging.js'
import {
  connectGmailFromCode,
  ensureMessageContact,
  formatReceivedAt,
  getGmailOAuthUrl,
  ingestTwilioSms,
  listInboxMessages,
  regenerateDraftForMessage,
  syncUserInbox,
} from '../lib/inboxSync.js'

const router = Router()
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(
  /\/$/,
  '',
)

function toMessageResponse(
  msg: typeof inboxMessages.$inferSelect,
  projectName: string | null,
) {
  return {
    id: msg.id,
    projectId: msg.projectId,
    projectName: projectName ?? 'General',
    clientName: msg.clientName,
    channel: msg.channel as 'email' | 'sms',
    body: msg.body,
    subject: msg.subject,
    receivedAt: formatReceivedAt(msg.receivedAt),
    receivedAtIso: msg.receivedAt.toISOString(),
    status: msg.status as 'pending' | 'approved' | 'sent',
    aiDraft: msg.aiDraft ?? '',
    draftBody: msg.draftBody ?? msg.aiDraft ?? '',
    clientEmail: msg.clientEmail,
    clientPhone: msg.clientPhone,
  }
}

router.get('/oauth/gmail/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string }

    if (
      !code ||
      !state ||
      state !== req.session.gmailOAuthState ||
      !req.session.gmailOAuthUserId
    ) {
      res.redirect(`${CLIENT_URL}/dashboard/messages?error=gmail_oauth_failed`)
      return
    }

    const userId = req.session.gmailOAuthUserId
    delete req.session.gmailOAuthState
    delete req.session.gmailOAuthUserId

    await connectGmailFromCode(userId, code)
    await syncUserInbox(userId)

    res.redirect(`${CLIENT_URL}/dashboard/messages?gmail=connected`)
  } catch (error) {
    next(error)
  }
})

router.post('/webhooks/twilio/sms', async (req, res, next) => {
  try {
    const { From, To, Body, MessageSid } = req.body as {
      From?: string
      To?: string
      Body?: string
      MessageSid?: string
    }

    if (!From || !To || !Body || !MessageSid) {
      res.status(400).send('Missing fields')
      return
    }

    await ingestTwilioSms({
      from: From,
      to: To,
      body: Body,
      messageSid: MessageSid,
    })

    res.type('text/xml').send('<Response></Response>')
  } catch (error) {
    next(error)
  }
})

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id

    const [user] = await db
      .select({
        companyName: users.companyName,
        email: users.email,
        businessPhone: users.businessPhone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const contact = await ensureMessageContact(userId)

    if (!contact.contactEmail && !contact.contactPhone) {
      await db
        .update(messageContacts)
        .set({
          contactEmail: user?.email ?? null,
          contactPhone: user?.businessPhone ?? null,
          updatedAt: new Date(),
        })
        .where(eq(messageContacts.userId, userId))
    }

    await syncUserInbox(userId, user?.companyName)

    const refreshedContact = await ensureMessageContact(userId)
    const rows = await listInboxMessages(userId)

    const projectIds = [...new Set(rows.map((r) => r.projectId).filter(Boolean))]
    const projectRows =
      projectIds.length > 0
        ? await db
            .select({ id: projects.id, name: projects.name })
            .from(projects)
            .where(inArray(projects.id, projectIds as string[]))
        : []

    const projectMap = new Map(projectRows.map((p) => [p.id, p.name]))

    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    )
    const twilioConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
    )

    res.json({
      contact: {
        email: refreshedContact.contactEmail ?? user?.email ?? '',
        phone: refreshedContact.contactPhone ?? user?.businessPhone ?? '',
      },
      integrations: {
        gmail: refreshedContact.gmailStatus === 'connected' ? 'connected' : 'not_connected',
        emailSend: smtpConfigured ? 'configured' : 'not_configured',
        smsSend: twilioConfigured ? 'configured' : 'not_configured',
        ai: process.env.OPENAI_API_KEY ? 'configured' : 'fallback',
        lastGmailSyncAt: refreshedContact.lastGmailSyncAt?.toISOString() ?? null,
      },
      messages: rows.map((m) =>
        toMessageResponse(m, m.projectId ? projectMap.get(m.projectId) ?? null : null),
      ),
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/contact', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const { email, phone } = req.body as { email?: string; phone?: string }

    await ensureMessageContact(userId)

    const updates: Partial<typeof messageContacts.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (email !== undefined) updates.contactEmail = email.trim() || null
    if (phone !== undefined) updates.contactPhone = phone.trim() || null

    const [updated] = await db
      .update(messageContacts)
      .set(updates)
      .where(eq(messageContacts.userId, userId))
      .returning()

    res.json({
      contact: {
        email: updated.contactEmail ?? '',
        phone: updated.contactPhone ?? '',
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/sync', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const [user] = await db
      .select({ companyName: users.companyName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const result = await syncUserInbox(userId, user?.companyName)
    res.json({ success: true, ...result })
  } catch (error) {
    next(error)
  }
})

router.get('/oauth/gmail', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex')
  req.session.gmailOAuthState = state
  req.session.gmailOAuthUserId = req.user!.id
  res.redirect(getGmailOAuthUrl(state))
})

router.post('/:id/draft', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const [user] = await db
      .select({ companyName: users.companyName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const updated = await regenerateDraftForMessage(
      req.params.id,
      userId,
      user?.companyName,
    )
    if (!updated) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    res.json({
      message: {
        aiDraft: updated.aiDraft ?? '',
        draftBody: updated.draftBody ?? '',
      },
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id/draft', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const { draftBody } = req.body as { draftBody?: string }

    if (typeof draftBody !== 'string') {
      res.status(400).json({ error: 'draftBody is required' })
      return
    }

    const [updated] = await db
      .update(inboxMessages)
      .set({ draftBody, updatedAt: new Date() })
      .where(
        and(eq(inboxMessages.id, req.params.id), eq(inboxMessages.userId, userId)),
      )
      .returning()

    if (!updated) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    res.json({ draftBody: updated.draftBody })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/approve', async (req, res, next) => {
  try {
    const userId = req.user!.id

    const [updated] = await db
      .update(inboxMessages)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(
        and(
          eq(inboxMessages.id, req.params.id),
          eq(inboxMessages.userId, userId),
          eq(inboxMessages.status, 'pending'),
        ),
      )
      .returning()

    if (!updated) {
      const [existing] = await db
        .select()
        .from(inboxMessages)
        .where(
          and(eq(inboxMessages.id, req.params.id), eq(inboxMessages.userId, userId)),
        )
        .limit(1)

      if (!existing) {
        res.status(404).json({ error: 'Message not found' })
        return
      }

      res.json({ status: existing.status })
      return
    }

    res.json({ status: updated.status })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/send', async (req, res, next) => {
  try {
    const userId = req.user!.id

    const [msg] = await db
      .select()
      .from(inboxMessages)
      .where(
        and(eq(inboxMessages.id, req.params.id), eq(inboxMessages.userId, userId)),
      )
      .limit(1)

    if (!msg) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    if (msg.status === 'sent') {
      res.status(409).json({ error: 'Message was already sent' })
      return
    }

    const body = msg.draftBody ?? msg.aiDraft ?? ''
    if (!body.trim()) {
      res.status(400).json({ error: 'Draft is empty' })
      return
    }

    const result = await sendClientReply({
      channel: msg.channel as 'email' | 'sms',
      clientEmail: msg.clientEmail,
      clientPhone: msg.clientPhone,
      clientName: msg.clientName,
      subject: msg.subject ? `Re: ${msg.subject}` : undefined,
      body,
    })

    const [updated] = await db
      .update(inboxMessages)
      .set({
        status: 'sent',
        sentAt: new Date(),
        draftBody: body,
        updatedAt: new Date(),
      })
      .where(eq(inboxMessages.id, msg.id))
      .returning()

    res.json({
      success: true,
      status: updated.status,
      emailSent: result.emailSent,
      smsSent: result.smsSent,
      warnings: result.errors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send failed'
    res.status(400).json({ error: message })
  }
})

export default router
