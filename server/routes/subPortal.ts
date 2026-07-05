import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'
import { milestones } from '../db/cashflowSchema.js'
import {
  subInvoiceSubmissions,
  subcontractors,
} from '../db/subcontractorSchema.js'

const router = Router()

router.get('/:token', async (req, res, next) => {
  try {
    const [sub] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.portalToken, req.params.token))
      .limit(1)

    if (!sub) {
      res.status(404).json({ error: 'Portal link not found or expired' })
      return
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, sub.projectId))
      .limit(1)

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const milestoneRows = await db
      .select({
        id: milestones.id,
        stageName: milestones.stageName,
        status: milestones.status,
        amount: milestones.amount,
      })
      .from(milestones)
      .where(eq(milestones.projectId, sub.projectId))

    const submissions = await db
      .select()
      .from(subInvoiceSubmissions)
      .where(eq(subInvoiceSubmissions.subcontractorId, sub.id))

    res.json({
      subcontractor: {
        name: sub.name,
        trade: sub.trade,
      },
      project: {
        name: project.name,
        clientName: project.clientName,
      },
      milestones: milestoneRows,
      submissions: submissions.map((s) => ({
        id: s.id,
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

router.post('/:token/invoices', async (req, res, next) => {
  try {
    const [sub] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.portalToken, req.params.token))
      .limit(1)

    if (!sub) {
      res.status(404).json({ error: 'Portal link not found' })
      return
    }

    const { linkedStage, milestoneId, amount, description } = req.body
    const parsedAmount = Number(amount)

    if (!linkedStage?.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: 'Linked stage and valid amount are required' })
      return
    }

    const [created] = await db
      .insert(subInvoiceSubmissions)
      .values({
        subcontractorId: sub.id,
        projectId: sub.projectId,
        milestoneId: milestoneId || null,
        linkedStage: linkedStage.trim(),
        amount: Math.round(parsedAmount),
        description: description?.trim() || null,
        status: 'pending_review',
      })
      .returning()

    res.status(201).json({
      submission: {
        id: created.id,
        status: created.status,
        amount: created.amount,
        linkedStage: created.linkedStage,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
