import { db } from '../db/index.js'
import { milestones, subcontractorBills } from '../db/cashflowSchema.js'

const demoMilestones = [
  { stageName: 'Deposit (15%)', amount: 6750, status: 'paid' as const, completedDate: '2026-05-12', dueDate: '2026-05-12' },
  { stageName: 'Demo & Prep Complete', amount: 4500, status: 'paid' as const, completedDate: '2026-05-28', dueDate: '2026-05-28' },
  { stageName: 'Framing Complete', amount: 9000, status: 'invoiced' as const, completedDate: '2026-06-18', dueDate: '2026-06-10' },
  { stageName: 'Rough-In Plumbing & Electrical', amount: 9450, status: 'pending' as const, completedDate: null, dueDate: '2026-07-15' },
  { stageName: 'Cabinets & Countertops Installed', amount: 9000, status: 'pending' as const, completedDate: null, dueDate: '2026-08-01' },
  { stageName: 'Final Walkthrough & Punch List', amount: 6300, status: 'pending' as const, completedDate: null, dueDate: '2026-08-20' },
]

const demoBills = [
  { trade: 'Demo & Haul-Off', amount: 1100, dueDate: '2026-06-02', status: 'paid' as const, linkedStage: 'Demo & Prep Complete' },
  { trade: 'Electrical Rough-In', amount: 2900, dueDate: '2026-06-10', status: 'paid' as const, linkedStage: 'Demo & Prep Complete' },
  { trade: 'Framing', amount: 7200, dueDate: '2026-06-22', status: 'unpaid' as const, linkedStage: 'Framing Complete' },
  { trade: 'Plumbing', amount: 3850, dueDate: '2026-06-20', status: 'unpaid' as const, linkedStage: 'Rough-In Plumbing & Electrical' },
  { trade: 'Drywall', amount: 4200, dueDate: '2026-06-28', status: 'unpaid' as const, linkedStage: 'Rough-In Plumbing & Electrical' },
]

export async function seedDemoCashflow(projectId: string) {
  await db.insert(milestones).values(
    demoMilestones.map((m) => ({ projectId, ...m })),
  )
  await db.insert(subcontractorBills).values(
    demoBills.map((b) => ({ projectId, ...b })),
  )
}
