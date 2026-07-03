import type { ProjectCashflow } from '../lib/api'
import type { ProjectCashFlow } from '../components/cashflow/types'

export function toVisualizerData(data: ProjectCashflow): ProjectCashFlow {
  const { project, milestones, bills } = data

  return {
    projectName: project.name,
    projectValue: project.contractValue,
    clientName: project.address
      ? `${project.clientName} — ${project.address}`
      : project.clientName,
    milestones: milestones.map((m) => ({
      id: m.id,
      stageName: m.stageName,
      amount: m.amount,
      status: m.status,
      completedDate: m.completedDate ?? undefined,
      dueDate: m.dueDate ?? undefined,
    })),
    subcontractorBills: bills.map((b) => ({
      id: b.id,
      trade: b.trade,
      amount: b.amount,
      dueDate: b.dueDate,
      status: b.status,
      linkedStage: b.linkedStage,
    })),
  }
}
