import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { milestones, subcontractorBills } from '../db/cashflowSchema.js'
import { projects } from '../db/schema.js'
import { computeMetrics } from '../lib/cashflow.js'
import { isBillOverdue, isMilestoneOverdue } from '../lib/dates.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.use(requireAuth)

router.get('/company', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))

    const referenceDate = new Date()

    let totalFundsCollected = 0
    let totalAwaitingApproval = 0
    let totalSubOwed = 0
    let totalNext14DayOutflow = 0
    let totalCashFronting = 0
    let projectsInCrunch = 0

    const projectSummaries = []

    for (const project of userProjects) {
      const [milestoneRows, billRows] = await Promise.all([
        db
          .select()
          .from(milestones)
          .where(eq(milestones.projectId, project.id)),
        db
          .select()
          .from(subcontractorBills)
          .where(eq(subcontractorBills.projectId, project.id)),
      ])

      const metrics = computeMetrics(
        milestoneRows.map((m) => ({ amount: m.amount, status: m.status })),
        billRows.map((b) => ({
          amount: b.amount,
          status: b.status,
          dueDate: b.dueDate,
        })),
        referenceDate,
      )

      totalFundsCollected += metrics.fundsCollected
      totalAwaitingApproval += metrics.awaitingClientApproval
      totalSubOwed += metrics.totalSubOwed
      totalNext14DayOutflow += metrics.next14DayOutflow
      totalCashFronting += metrics.cashFronting
      if (metrics.isCashCrunch) projectsInCrunch += 1

      const overdue = {
        overdueInflows: milestoneRows.filter((m) =>
          isMilestoneOverdue(m.status, m.dueDate, referenceDate),
        ).length,
        overdueOutflows: billRows.filter((b) =>
          isBillOverdue(b.status, b.dueDate, referenceDate),
        ).length,
      }

      if (milestoneRows.length > 0 || billRows.length > 0) {
        projectSummaries.push({
          id: project.id,
          name: project.name,
          fundsCollected: metrics.fundsCollected,
          awaitingClientApproval: metrics.awaitingClientApproval,
          totalSubOwed: metrics.totalSubOwed,
          netRunway: metrics.netRunway,
          isCashCrunch: metrics.isCashCrunch,
          ...overdue,
          hasOverdue: overdue.overdueInflows + overdue.overdueOutflows > 0,
        })
      }
    }

    const netRunway = totalFundsCollected - totalSubOwed

    res.json({
      totals: {
        fundsCollected: totalFundsCollected,
        awaitingClientApproval: totalAwaitingApproval,
        totalSubOwed: totalSubOwed,
        netRunway,
        next14DayOutflow: totalNext14DayOutflow,
        cashFronting: totalCashFronting,
        activeProjects: userProjects.length,
        projectsInCrunch,
        projectsWithData: projectSummaries.length,
      },
      projects: projectSummaries,
    })
  } catch (error) {
    next(error)
  }
})

export default router
