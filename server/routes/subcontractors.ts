import { Router } from 'express'
import crypto from 'crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'
import { milestones, subcontractorBills } from '../db/cashflowSchema.js'
import {
  subInvoiceSubmissions,
  subcontractors,
} from '../db/subcontractorSchema.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { computePhaseRunway } from '../lib/reminderScheduler.js'

const router = Router()
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(
  /\/$/,
  '',
)

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id

    const subs = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.userId, userId))
      .orderBy(desc(subcontractors.createdAt))

    const submissions = await db
      .select()
      .from(subInvoiceSubmissions)
      .orderBy(desc(subInvoiceSubmissions.createdAt))

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))

    const projectMap = new Map(userProjects.map((p) => [p.id, p]))
    const subIds = new Set(subs.map((s) => s.id))

    res.json({
      subcontractors: subs.map((sub) => ({
        id: sub.id,
        projectId: sub.projectId,
        projectName: projectMap.get(sub.projectId)?.name ?? 'Unknown',
        name: sub.name,
        email: sub.email,
        phone: sub.phone,
        trade: sub.trade,
        portalUrl: `${CLIENT_URL}/portal/sub/${sub.portalToken}`,
        createdAt: sub.createdAt.toISOString(),
      })),
      submissions: submissions
        .filter((s) => subIds.has(s.subcontractorId))
        .map((s) => ({
          id: s.id,
          subcontractorId: s.subcontractorId,
          projectId: s.projectId,
          projectName: projectMap.get(s.projectId)?.name ?? 'Unknown',
          linkedStage: s.linkedStage,
          amount: s.amount,
          description: s.description,
          status: s.status,
          createdAt: s.createdAt.toISOString(),
        })),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const { projectId, name, email, phone, trade } = req.body

    if (!projectId || !name?.trim() || !email?.trim() || !trade?.trim()) {
      res.status(400).json({ error: 'Project, name, email, and trade are required' })
      return
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const portalToken = crypto.randomBytes(24).toString('hex')
    const [created] = await db
      .insert(subcontractors)
      .values({
        userId,
        projectId,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        trade: trade.trim(),
        portalToken,
      })
      .returning()

    res.status(201).json({
      subcontractor: {
        id: created.id,
        projectId: created.projectId,
        name: created.name,
        email: created.email,
        trade: created.trade,
        portalUrl: `${CLIENT_URL}/portal/sub/${created.portalToken}`,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/submissions/:id/approve', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const submissionId = req.params.id

    const [submission] = await db
      .select()
      .from(subInvoiceSubmissions)
      .where(eq(subInvoiceSubmissions.id, submissionId))
      .limit(1)

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' })
      return
    }

    const [sub] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.id, submission.subcontractorId),
          eq(subcontractors.userId, userId),
        ),
      )
      .limit(1)

    if (!sub) {
      res.status(404).json({ error: 'Submission not found' })
      return
    }

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)
    const dueDateStr = dueDate.toISOString().slice(0, 10)

    const [bill] = await db
      .insert(subcontractorBills)
      .values({
        projectId: submission.projectId,
        trade: sub.trade,
        amount: submission.amount,
        dueDate: dueDateStr,
        status: 'unpaid',
        linkedStage: submission.linkedStage,
        milestoneId: submission.milestoneId,
      })
      .returning()

    await db
      .update(subInvoiceSubmissions)
      .set({ status: 'approved', billId: bill.id, updatedAt: new Date() })
      .where(eq(subInvoiceSubmissions.id, submissionId))

    res.json({ success: true, billId: bill.id })
  } catch (error) {
    next(error)
  }
})

router.post('/submissions/:id/reject', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const [submission] = await db
      .select()
      .from(subInvoiceSubmissions)
      .where(eq(subInvoiceSubmissions.id, req.params.id))
      .limit(1)

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' })
      return
    }

    const [sub] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.id, submission.subcontractorId),
          eq(subcontractors.userId, userId),
        ),
      )
      .limit(1)

    if (!sub) {
      res.status(404).json({ error: 'Submission not found' })
      return
    }

    await db
      .update(subInvoiceSubmissions)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(subInvoiceSubmissions.id, req.params.id))

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.get('/phase-runway/:projectId', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const { projectId } = req.params

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const milestoneRows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))

    const billRows = await db
      .select()
      .from(subcontractorBills)
      .where(eq(subcontractorBills.projectId, projectId))

    res.json({
      phases: computePhaseRunway(milestoneRows, billRows),
    })
  } catch (error) {
    next(error)
  }
})

export default router
