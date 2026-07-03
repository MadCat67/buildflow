import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { milestones, subcontractorBills } from '../db/cashflowSchema.js'
import { isBillOverdue, isMilestoneOverdue } from './dates.js'

export async function getProjectOverdueSummary(projectId: string) {
  const referenceDate = new Date()
  const [milestoneRows, billRows] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, projectId)),
    db
      .select()
      .from(subcontractorBills)
      .where(eq(subcontractorBills.projectId, projectId)),
  ])

  let overdueInflows = 0
  let overdueOutflows = 0

  for (const m of milestoneRows) {
    if (isMilestoneOverdue(m.status, m.dueDate, referenceDate)) overdueInflows++
  }

  for (const b of billRows) {
    if (isBillOverdue(b.status, b.dueDate, referenceDate)) overdueOutflows++
  }

  return {
    overdueInflows,
    overdueOutflows,
    hasOverdue: overdueInflows + overdueOutflows > 0,
  }
}
