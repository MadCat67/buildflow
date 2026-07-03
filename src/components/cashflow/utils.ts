import type { CashFlowMetrics, ProjectCashFlow } from './types'

const MS_PER_DAY = 86_400_000

export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  return amount < 0 ? `-${formatted}` : formatted
}

export function formatDueDate(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isMilestoneOverdue(
  status: string,
  dueDate: string | null | undefined,
  from = new Date(),
): boolean {
  if (status === 'paid' || !dueDate) return false
  return daysUntil(dueDate, from) < 0
}

export function daysUntil(isoDate: string, from = new Date()): number {
  const due = new Date(isoDate + 'T12:00:00')
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return Math.round((dueDay.getTime() - today.getTime()) / MS_PER_DAY)
}

export function isBillOverdue(
  status: string,
  dueDate: string,
  from = new Date(),
): boolean {
  if (status === 'paid') return false
  return daysUntil(dueDate, from) < 0
}

export function computeMetrics(
  project: ProjectCashFlow,
  referenceDate = new Date(),
): CashFlowMetrics {
  const fundsCollected = project.milestones
    .filter((m) => m.status === 'paid')
    .reduce((sum, m) => sum + m.amount, 0)

  const awaitingClientApproval = project.milestones
    .filter((m) => m.status === 'invoiced')
    .reduce((sum, m) => sum + m.amount, 0)

  const guaranteedIncoming = 0

  const totalSubOwed = project.subcontractorBills
    .filter((b) => b.status === 'unpaid')
    .reduce((sum, b) => sum + b.amount, 0)

  const next14DayOutflow = project.subcontractorBills
    .filter(
      (b) =>
        b.status === 'unpaid' &&
        daysUntil(b.dueDate, referenceDate) >= 0 &&
        daysUntil(b.dueDate, referenceDate) <= 14,
    )
    .reduce((sum, b) => sum + b.amount, 0)

  const netRunway = fundsCollected + guaranteedIncoming - totalSubOwed
  const cashFronting = Math.max(0, totalSubOwed - fundsCollected)
  const isCashCrunch = fundsCollected < totalSubOwed

  return {
    fundsCollected,
    guaranteedIncoming,
    totalSubOwed,
    netRunway,
    awaitingClientApproval,
    next14DayOutflow,
    cashFronting,
    isCashCrunch,
  }
}
