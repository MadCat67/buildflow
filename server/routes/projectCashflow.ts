import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { milestones, subcontractorBills } from '../db/cashflowSchema.js'
import { computeMetrics } from '../lib/cashflow.js'
import { seedDemoCashflow } from '../lib/demoSeed.js'
import { sendPaymentRequest } from '../lib/notifications.js'
import { syncMilestoneToCalendars } from '../lib/calendarSync.js'
import {
  computePayWhenPaidStatus,
  computePhaseRunway,
} from '../lib/reminderScheduler.js'
import { getOwnedProject } from '../middleware/requireProject.js'

const router = Router({ mergeParams: true })

type Params = { id: string; milestoneId?: string; billId?: string }

async function loadCashflow(projectId: string) {
  const [milestoneRows, billRows] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, projectId)),
    db
      .select()
      .from(subcontractorBills)
      .where(eq(subcontractorBills.projectId, projectId)),
  ])

  return {
    milestones: milestoneRows.map(toMilestoneResponse),
    bills: billRows.map((b) => toBillResponse(b, milestoneRows)),
    phaseRunway: computePhaseRunway(milestoneRows, billRows),
  }
}

router.get('/cashflow', async (req, res, next) => {
  try {
    const { id } = req.params as Params
    const project = await getOwnedProject(id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    let { milestones: ms, bills, phaseRunway } = await loadCashflow(id)

    if (project.isDemo && ms.length === 0 && bills.length === 0) {
      await seedDemoCashflow(id)
      const reloaded = await loadCashflow(id)
      ms = reloaded.milestones
      bills = reloaded.bills
      phaseRunway = reloaded.phaseRunway
    }

    res.json({
      project: toProjectResponse(project),
      milestones: ms,
      bills,
      phaseRunway,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/milestones', async (req, res, next) => {
  try {
    const { id } = req.params as Params
    const project = await getOwnedProject(id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const { stageName, amount, status, completedDate, dueDate } = req.body
    if (!stageName?.trim()) {
      res.status(400).json({ error: 'Stage name is required' })
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' })
      return
    }

    if (!['paid', 'invoiced', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }

    const [created] = await db
      .insert(milestones)
      .values({
        projectId: id,
        stageName: stageName.trim(),
        amount: Math.round(parsedAmount),
        status,
        completedDate: completedDate || null,
        dueDate: dueDate || null,
      })
      .returning()

    await syncMilestoneToCalendars(project.userId, created, project)

    res.status(201).json({ milestone: toMilestoneResponse(created) })
  } catch (error) {
    next(error)
  }
})

router.patch('/milestones/:milestoneId', async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params as Params
    const project = await getOwnedProject(id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const [existing] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, milestoneId!))
      .limit(1)

    if (!existing || existing.projectId !== id) {
      res.status(404).json({ error: 'Milestone not found' })
      return
    }

    const { stageName, amount, status, completedDate, dueDate } = req.body
    const updates: Partial<typeof milestones.$inferInsert> = {}

    if (stageName !== undefined) updates.stageName = stageName.trim()
    if (amount !== undefined) {
      const parsed = Number(amount)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        res.status(400).json({ error: 'Amount must be a positive number' })
        return
      }
      updates.amount = Math.round(parsed)
    }
    if (status !== undefined) {
      if (!['paid', 'invoiced', 'pending'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' })
        return
      }
      updates.status = status
    }
    if (completedDate !== undefined) updates.completedDate = completedDate || null
    if (dueDate !== undefined) updates.dueDate = dueDate || null

    const [updated] = await db
      .update(milestones)
      .set(updates)
      .where(eq(milestones.id, milestoneId!))
      .returning()

    await syncMilestoneToCalendars(project.userId, updated, project)

    res.json({ milestone: toMilestoneResponse(updated) })
  } catch (error) {
    next(error)
  }
})

router.post('/milestones/:milestoneId/request-payment', async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params as Params
    const project = await getOwnedProject(id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const [milestone] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, milestoneId!))
      .limit(1)

    if (!milestone || milestone.projectId !== id) {
      res.status(404).json({ error: 'Milestone not found' })
      return
    }

    if (milestone.status === 'paid') {
      res.status(400).json({ error: 'This milestone is already paid' })
      return
    }

    const channels = req.body.channels as string[] | undefined
    const tone = req.body.tone as 'gentle' | 'reminder' | 'firm' | undefined
    if (!channels?.length || !channels.every((c) => c === 'email' || c === 'sms')) {
      res.status(400).json({ error: 'Select email, sms, or both' })
      return
    }

    const daysUntilDue = milestone.dueDate
      ? Math.round(
          (new Date(milestone.dueDate + 'T12:00:00').getTime() -
            new Date().setHours(0, 0, 0, 0)) /
            86_400_000,
        )
      : null

    const result = await sendPaymentRequest({
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone,
      projectName: project.name,
      projectId: id,
      milestoneId: milestoneId!,
      stageName: milestone.stageName,
      amount: milestone.amount,
      dueDate: milestone.dueDate,
      channels: channels as ('email' | 'sms')[],
      tone: tone ?? (daysUntilDue !== null && daysUntilDue < 0 ? 'firm' : 'gentle'),
      daysUntilDue,
    })

    res.json({
      success: true,
      emailSent: result.emailSent,
      smsSent: result.smsSent,
      warnings: result.errors,
    })
  } catch (error) {
    next(error)
  }
})

router.delete('/milestones/:milestoneId', async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params as Params
    const project = await getOwnedProject(id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const [existing] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, milestoneId!))
      .limit(1)

    if (!existing || existing.projectId !== id) {
      res.status(404).json({ error: 'Milestone not found' })
      return
    }

    await syncMilestoneToCalendars(project.userId, existing, project, 'delete')
    await db.delete(milestones).where(eq(milestones.id, milestoneId!))
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.post('/bills', async (req, res, next) => {
  try {
    const { id } = req.params as Params
    const project = await getOwnedProject(id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const { trade, amount, dueDate, status, linkedStage } = req.body
    if (!trade?.trim() || !linkedStage?.trim()) {
      res.status(400).json({ error: 'Trade and linked stage are required' })
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' })
      return
    }

    if (!dueDate) {
      res.status(400).json({ error: 'Due date is required' })
      return
    }

    if (!['paid', 'unpaid'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }

    const [created] = await db
      .insert(subcontractorBills)
      .values({
        projectId: id,
        trade: trade.trim(),
        amount: Math.round(parsedAmount),
        dueDate,
        status,
        linkedStage: linkedStage.trim(),
        milestoneId: req.body.milestoneId || null,
      })
      .returning()

    const milestoneRows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, id))

    res.status(201).json({ bill: toBillResponse(created, milestoneRows) })
  } catch (error) {
    next(error)
  }
})

router.patch('/bills/:billId', async (req, res, next) => {
  try {
    const { id, billId } = req.params as Params
    const project = await getOwnedProject(id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const [existing] = await db
      .select()
      .from(subcontractorBills)
      .where(eq(subcontractorBills.id, billId!))
      .limit(1)

    if (!existing || existing.projectId !== id) {
      res.status(404).json({ error: 'Bill not found' })
      return
    }

    const { trade, amount, dueDate, status, linkedStage } = req.body
    const updates: Partial<typeof subcontractorBills.$inferInsert> = {}

    if (trade !== undefined) updates.trade = trade.trim()
    if (linkedStage !== undefined) updates.linkedStage = linkedStage.trim()
    if (amount !== undefined) {
      const parsed = Number(amount)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        res.status(400).json({ error: 'Amount must be a positive number' })
        return
      }
      updates.amount = Math.round(parsed)
    }
    if (dueDate !== undefined) updates.dueDate = dueDate
    if (status !== undefined) {
      if (!['paid', 'unpaid'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' })
        return
      }
      updates.status = status
    }

    const [updated] = await db
      .update(subcontractorBills)
      .set(updates)
      .where(eq(subcontractorBills.id, billId!))
      .returning()

    const milestoneRows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, id))

    res.json({ bill: toBillResponse(updated, milestoneRows) })
  } catch (error) {
    next(error)
  }
})

router.delete('/bills/:billId', async (req, res, next) => {
  try {
    const { id, billId } = req.params as Params
    const project = await getOwnedProject(id, req.user!.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const [existing] = await db
      .select()
      .from(subcontractorBills)
      .where(eq(subcontractorBills.id, billId!))
      .limit(1)

    if (!existing || existing.projectId !== id) {
      res.status(404).json({ error: 'Bill not found' })
      return
    }

    await db.delete(subcontractorBills).where(eq(subcontractorBills.id, billId!))
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

function toProjectResponse(project: {
  id: string
  name: string
  clientName: string
  address: string | null
  clientEmail: string | null
  clientPhone: string | null
  contractValue: number
  isDemo: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: project.id,
    name: project.name,
    clientName: project.clientName,
    address: project.address,
    clientEmail: project.clientEmail,
    clientPhone: project.clientPhone,
    contractValue: project.contractValue,
    isDemo: project.isDemo,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }
}

function toMilestoneResponse(m: typeof milestones.$inferSelect) {
  return {
    id: m.id,
    stageName: m.stageName,
    amount: m.amount,
    status: m.status,
    completedDate: m.completedDate,
    dueDate: m.dueDate,
  }
}

function toBillResponse(
  b: typeof subcontractorBills.$inferSelect,
  milestoneRows: typeof milestones.$inferSelect[] = [],
) {
  return {
    id: b.id,
    trade: b.trade,
    amount: b.amount,
    dueDate: b.dueDate,
    status: b.status,
    linkedStage: b.linkedStage,
    milestoneId: b.milestoneId,
    payWhenPaidStatus: computePayWhenPaidStatus(
      { status: b.status, linkedStage: b.linkedStage, milestoneId: b.milestoneId },
      milestoneRows,
    ),
  }
}

export { computeMetrics, loadCashflow }
export default router
