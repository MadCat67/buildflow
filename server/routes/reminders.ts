import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  paymentReminderLog,
  reminderSettings,
} from '../db/remindersSchema.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { processAutomatedReminders } from '../lib/reminderScheduler.js'
import { buildReminderMessage } from '../lib/reminderTemplates.js'

const router = Router()
router.use(requireAuth)

async function ensureSettings(userId: string) {
  const [existing] = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.userId, userId))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(reminderSettings)
    .values({ userId })
    .returning()

  return created
}

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const settings = await ensureSettings(userId)

    const log = await db
      .select()
      .from(paymentReminderLog)
      .where(eq(paymentReminderLog.userId, userId))
      .orderBy(desc(paymentReminderLog.sentAt))
      .limit(50)

    const sampleGentle = buildReminderMessage('gentle', {
      clientName: 'Sarah Johnson',
      projectName: 'Kitchen Renovation',
      stageName: 'Framing Complete',
      amount: 9000,
      dueDate: '2026-07-05',
      paymentLink: 'https://buildflow.app/pay/example',
      daysUntilDue: 1,
    })

    const sampleFirm = buildReminderMessage('firm', {
      clientName: 'Sarah Johnson',
      projectName: 'Kitchen Renovation',
      stageName: 'Framing Complete',
      amount: 9000,
      dueDate: '2026-06-28',
      paymentLink: 'https://buildflow.app/pay/example',
      daysUntilDue: -7,
    })

    res.json({
      settings: {
        autoRemindersEnabled: settings.autoRemindersEnabled,
        emailEnabled: settings.emailEnabled,
        smsEnabled: settings.smsEnabled,
        daysBeforeDue: settings.daysBeforeDue,
        escrowEnabled: settings.escrowEnabled,
      },
      log: log.map((entry) => ({
        id: entry.id,
        milestoneId: entry.milestoneId,
        projectId: entry.projectId,
        tone: entry.tone,
        channel: entry.channel,
        messagePreview: entry.messagePreview,
        sentAt: entry.sentAt.toISOString(),
      })),
      templates: {
        gentle: sampleGentle,
        reminder: buildReminderMessage('reminder', {
          clientName: 'Sarah Johnson',
          projectName: 'Kitchen Renovation',
          stageName: 'Framing Complete',
          amount: 9000,
          dueDate: '2026-07-04',
          paymentLink: 'https://buildflow.app/pay/example',
          daysUntilDue: 0,
        }),
        firm: sampleFirm,
      },
      escalationSchedule: [
        { days: 3, tone: 'gentle', label: '3 days before due — friendly heads-up' },
        { days: 1, tone: 'gentle', label: '1 day before — keep crew on schedule' },
        { days: 0, tone: 'reminder', label: 'Due date — invoice ready for approval' },
        { days: -3, tone: 'firm', label: '3 days overdue — payment needed' },
        { days: -7, tone: 'firm', label: '7 days overdue — important follow-up' },
      ],
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/settings', async (req, res, next) => {
  try {
    const userId = req.user!.id
    await ensureSettings(userId)

    const {
      autoRemindersEnabled,
      emailEnabled,
      smsEnabled,
      daysBeforeDue,
      escrowEnabled,
    } = req.body

    const updates: Partial<typeof reminderSettings.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (autoRemindersEnabled !== undefined) {
      updates.autoRemindersEnabled = !!autoRemindersEnabled
      if (!autoRemindersEnabled) {
        updates.emailEnabled = false
        updates.smsEnabled = false
      }
    }
    if (emailEnabled !== undefined) updates.emailEnabled = !!emailEnabled
    if (smsEnabled !== undefined) updates.smsEnabled = !!smsEnabled
    if (daysBeforeDue !== undefined) updates.daysBeforeDue = String(daysBeforeDue)
    if (escrowEnabled !== undefined) updates.escrowEnabled = !!escrowEnabled

    const [updated] = await db
      .update(reminderSettings)
      .set(updates)
      .where(eq(reminderSettings.userId, userId))
      .returning()

    res.json({
      settings: {
        autoRemindersEnabled: updated.autoRemindersEnabled,
        emailEnabled: updated.emailEnabled,
        smsEnabled: updated.smsEnabled,
        daysBeforeDue: updated.daysBeforeDue,
        escrowEnabled: updated.escrowEnabled,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/run-now', async (req, res, next) => {
  try {
    const sentCount = await processAutomatedReminders()
    res.json({
      success: true,
      sentCount,
      message: `Processed automated reminders — ${sentCount} message${sentCount === 1 ? '' : 's'} sent`,
    })
  } catch (error) {
    next(error)
  }
})

export default router
