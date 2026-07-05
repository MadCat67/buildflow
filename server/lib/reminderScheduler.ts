import { and, desc, eq, gte } from 'drizzle-orm'
import { db } from '../db/index.js'
import { milestones, subcontractorBills } from '../db/cashflowSchema.js'
import { projects } from '../db/schema.js'
import {
  paymentReminderLog,
  reminderSettings,
} from '../db/remindersSchema.js'
import {
  buildPaymentLink,
  resolveReminderTone,
  sendPaymentRequest,
  shouldSendReminder,
} from './notifications.js'

const MS_PER_DAY = 86_400_000

function daysUntil(isoDate: string, from = new Date()): number {
  const due = new Date(isoDate + 'T12:00:00')
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return Math.round((dueDay.getTime() - today.getTime()) / MS_PER_DAY)
}

async function wasReminderSentRecently(
  milestoneId: string,
  tone: string,
  withinHours = 20,
): Promise<boolean> {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000)
  const [recent] = await db
    .select()
    .from(paymentReminderLog)
    .where(
      and(
        eq(paymentReminderLog.milestoneId, milestoneId),
        eq(paymentReminderLog.tone, tone as 'gentle' | 'reminder' | 'firm'),
        gte(paymentReminderLog.sentAt, since),
      ),
    )
    .limit(1)

  return !!recent
}

export async function processAutomatedReminders(): Promise<number> {
  const allProjects = await db.select().from(projects)
  let sentCount = 0

  for (const project of allProjects) {
    const [settings] = await db
      .select()
      .from(reminderSettings)
      .where(eq(reminderSettings.userId, project.userId))
      .limit(1)

    const autoEnabled = settings?.autoRemindersEnabled ?? true
    if (!autoEnabled) continue

    const emailEnabled = settings?.emailEnabled ?? true
    const smsEnabled = settings?.smsEnabled ?? true
    if (!emailEnabled && !smsEnabled) continue

    const milestoneRows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, project.id))

    for (const milestone of milestoneRows) {
      if (milestone.status === 'paid' || !milestone.dueDate) continue
      if (milestone.status === 'pending') continue

      const days = daysUntil(milestone.dueDate)
      const tone = resolveReminderTone(days, milestone.status)
      if (!tone || !shouldSendReminder(tone, days)) continue

      if (await wasReminderSentRecently(milestone.id, tone)) continue

      const channels: ('email' | 'sms')[] = []
      if (emailEnabled && project.clientEmail) channels.push('email')
      if (smsEnabled && project.clientPhone) channels.push('sms')
      if (channels.length === 0) continue

      try {
        const result = await sendPaymentRequest({
          clientName: project.clientName,
          clientEmail: project.clientEmail,
          clientPhone: project.clientPhone,
          projectName: project.name,
          stageName: milestone.stageName,
          amount: milestone.amount,
          dueDate: milestone.dueDate,
          channels,
          tone,
          projectId: project.id,
          milestoneId: milestone.id,
          daysUntilDue: days,
        })

        await db.insert(paymentReminderLog).values({
          userId: project.userId,
          projectId: project.id,
          milestoneId: milestone.id,
          tone,
          channel:
            result.emailSent && result.smsSent
              ? 'both'
              : result.emailSent
                ? 'email'
                : 'sms',
          messagePreview: result.messagePreview ?? '',
        })

        sentCount++
      } catch (err) {
        console.error(
          `Auto reminder failed for milestone ${milestone.id}:`,
          err instanceof Error ? err.message : err,
        )
      }
    }
  }

  return sentCount
}

export function startReminderScheduler() {
  const intervalMs = 15 * 60 * 1000
  setInterval(() => {
    processAutomatedReminders().catch((err) => {
      console.error('Reminder scheduler error:', err)
    })
  }, intervalMs)

  processAutomatedReminders().catch((err) => {
    console.error('Initial reminder check error:', err)
  })
}

export function computePayWhenPaidStatus(
  bill: { status: string; linkedStage: string; milestoneId?: string | null },
  milestoneRows: { id: string; stageName: string; status: string; amount: number }[],
): 'paid' | 'payable' | 'held' | 'unpaid' {
  if (bill.status === 'paid') return 'paid'

  const linked = bill.milestoneId
    ? milestoneRows.find((m) => m.id === bill.milestoneId)
    : milestoneRows.find((m) => m.stageName === bill.linkedStage)

  if (!linked) return 'unpaid'
  if (linked.status === 'paid') return 'payable'
  return 'held'
}

export function computePhaseRunway(
  milestoneRows: {
    id: string
    stageName: string
    amount: number
    status: string
    dueDate: string | null
  }[],
  billRows: {
    amount: number
    status: string
    linkedStage: string
    milestoneId?: string | null
    dueDate: string
  }[],
  referenceDate = new Date(),
) {
  return milestoneRows.map((milestone) => {
    const linkedBills = billRows.filter(
      (b) =>
        b.milestoneId === milestone.id || b.linkedStage === milestone.stageName,
    )
    const subOwed = linkedBills
      .filter((b) => b.status === 'unpaid')
      .reduce((sum, b) => sum + b.amount, 0)

    const clientIncoming =
      milestone.status === 'paid'
        ? milestone.amount
        : milestone.status === 'invoiced'
          ? milestone.amount
          : 0

    const clientCollected = milestone.status === 'paid' ? milestone.amount : 0
    const gap = clientCollected - subOwed
    const crunchIn14Days = linkedBills.some((b) => {
      if (b.status !== 'unpaid') return false
      const due = new Date(b.dueDate + 'T12:00:00')
      const today = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        referenceDate.getDate(),
      )
      const days = Math.round((due.getTime() - today.getTime()) / MS_PER_DAY)
      return days >= 0 && days <= 14
    })

    return {
      milestoneId: milestone.id,
      stageName: milestone.stageName,
      milestoneStatus: milestone.status,
      clientIncoming,
      clientCollected,
      subOwed,
      gap,
      isCrunch: clientCollected < subOwed,
      crunchIn14Days,
      linkedBillCount: linkedBills.length,
    }
  })
}
