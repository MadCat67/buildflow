import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { seedDemoCashflow } from '../lib/demoSeed.js'
import { getProjectOverdueSummary } from '../lib/projectSummary.js'
import projectCashflowRoutes from './projectCashflow.js'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt))

    const projectsWithSummary = await Promise.all(
      rows.map(async (project) => {
        const overdue = await getProjectOverdueSummary(project.id)
        return { ...toProjectResponse(project), ...overdue }
      }),
    )

    res.json({ projects: projectsWithSummary })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const { name, clientName, address, clientEmail, clientPhone, contractValue } =
      req.body

    if (!name?.trim() || !clientName?.trim()) {
      res.status(400).json({ error: 'Project name and client name are required' })
      return
    }

    const value = Number(contractValue)
    if (!Number.isFinite(value) || value <= 0) {
      res.status(400).json({ error: 'Contract value must be a positive number' })
      return
    }

    const [created] = await db
      .insert(projects)
      .values({
        userId,
        name: name.trim(),
        clientName: clientName.trim(),
        address: address?.trim() || null,
        clientEmail: clientEmail?.trim() || null,
        clientPhone: clientPhone?.trim() || null,
        contractValue: Math.round(value),
        isDemo: false,
      })
      .returning()

    const overdue = await getProjectOverdueSummary(created.id)
    res.status(201).json({
      project: { ...toProjectResponse(created), ...overdue },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/sample/demo', async (req, res, next) => {
  try {
    const userId = req.user!.id

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))

    if (userProjects.some((p) => p.isDemo)) {
      res.status(409).json({ error: 'Sample project already exists' })
      return
    }

    const [created] = await db
      .insert(projects)
      .values({
        userId,
        name: '$45,000 Kitchen Renovation',
        clientName: 'Sarah & Mike Johnson',
        address: '142 Oak Street',
        clientEmail: 'sarah.johnson@example.com',
        clientPhone: '+15551234567',
        contractValue: 45000,
        isDemo: true,
      })
      .returning()

    await seedDemoCashflow(created.id)

    const overdue = await getProjectOverdueSummary(created.id)
    res.status(201).json({
      project: { ...toProjectResponse(created), ...overdue },
    })
  } catch (error) {
    next(error)
  }
})

router.use('/:id', projectCashflowRoutes)

router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, req.params.id))
      .limit(1)

    if (!project || project.userId !== userId) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const { name, clientName, address, clientEmail, clientPhone, contractValue } =
      req.body
    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (name !== undefined) updates.name = name.trim()
    if (clientName !== undefined) updates.clientName = clientName.trim()
    if (address !== undefined) updates.address = address?.trim() || null
    if (clientEmail !== undefined) updates.clientEmail = clientEmail?.trim() || null
    if (clientPhone !== undefined) updates.clientPhone = clientPhone?.trim() || null
    if (contractValue !== undefined) {
      const value = Number(contractValue)
      if (!Number.isFinite(value) || value <= 0) {
        res.status(400).json({ error: 'Contract value must be a positive number' })
        return
      }
      updates.contractValue = Math.round(value)
    }

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, req.params.id))
      .returning()

    const overdue = await getProjectOverdueSummary(updated.id)
    res.json({ project: { ...toProjectResponse(updated), ...overdue } })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, req.params.id))
      .limit(1)

    if (!project || project.userId !== userId) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const overdue = await getProjectOverdueSummary(project.id)
    res.json({ project: { ...toProjectResponse(project), ...overdue } })
  } catch (error) {
    next(error)
  }
})

function toProjectResponse(project: typeof projects.$inferSelect) {
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

export default router
