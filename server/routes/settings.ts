import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { calendarConnections } from '../db/calendarSchema.js'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  ensureReminderSettings,
  patchReminderSettings,
  toReminderSettingsResponse,
} from '../lib/reminderSettingsLib.js'

const router = Router()
router.use(requireAuth)

function integrationStatus() {
  const twilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  )
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )

  return { twilioConfigured, smtpConfigured }
}

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id

    const [user] = await db
      .select({
        companyName: users.companyName,
        businessPhone: users.businessPhone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const reminderRow = await ensureReminderSettings(userId)

    const connections = await db
      .select({
        provider: calendarConnections.provider,
        status: calendarConnections.status,
      })
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId))

    const googleCalendar = connections.find((c) => c.provider === 'google')
    const outlookCalendar = connections.find((c) => c.provider === 'outlook')
    const { twilioConfigured, smtpConfigured } = integrationStatus()

    res.json({
      company: {
        companyName: user?.companyName ?? '',
        businessPhone: user?.businessPhone ?? '',
      },
      notifications: toReminderSettingsResponse(reminderRow),
      integrations: {
        googleCalendar: googleCalendar?.status === 'connected' ? 'connected' : 'not_connected',
        outlookCalendar: outlookCalendar?.status === 'connected' ? 'connected' : 'not_connected',
        emailDelivery: smtpConfigured ? 'configured' : 'not_configured',
        smsDelivery: twilioConfigured ? 'configured' : 'not_configured',
        quickbooks: 'not_connected',
      },
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const { companyName, businessPhone, notifications } = req.body as {
      companyName?: string
      businessPhone?: string
      notifications?: {
        autoRemindersEnabled?: boolean
        emailEnabled?: boolean
        smsEnabled?: boolean
        escrowEnabled?: boolean
      }
    }

    if (companyName !== undefined || businessPhone !== undefined) {
      const userUpdates: Partial<typeof users.$inferInsert> = {
        updatedAt: new Date(),
      }
      if (companyName !== undefined) {
        userUpdates.companyName = companyName.trim() || null
      }
      if (businessPhone !== undefined) {
        userUpdates.businessPhone = businessPhone.trim() || null
      }

      await db.update(users).set(userUpdates).where(eq(users.id, userId))
    }

    let notificationSettings = toReminderSettingsResponse(
      await ensureReminderSettings(userId),
    )

    if (notifications) {
      notificationSettings = await patchReminderSettings(userId, notifications)
    }

    const [user] = await db
      .select({
        companyName: users.companyName,
        businessPhone: users.businessPhone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const connections = await db
      .select({
        provider: calendarConnections.provider,
        status: calendarConnections.status,
      })
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId))

    const googleCalendar = connections.find((c) => c.provider === 'google')
    const outlookCalendar = connections.find((c) => c.provider === 'outlook')
    const { twilioConfigured, smtpConfigured } = integrationStatus()

    res.json({
      company: {
        companyName: user?.companyName ?? '',
        businessPhone: user?.businessPhone ?? '',
      },
      notifications: notificationSettings,
      integrations: {
        googleCalendar: googleCalendar?.status === 'connected' ? 'connected' : 'not_connected',
        outlookCalendar: outlookCalendar?.status === 'connected' ? 'connected' : 'not_connected',
        emailDelivery: smtpConfigured ? 'configured' : 'not_configured',
        smsDelivery: twilioConfigured ? 'configured' : 'not_configured',
        quickbooks: 'not_connected',
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
