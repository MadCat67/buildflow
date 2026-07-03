const MS_PER_DAY = 86_400_000

export type CashflowItem = {
  amount: number
  status: string
  dueDate?: string | null
}

export type CashflowMetrics = {
  fundsCollected: number
  guaranteedIncoming: number
  totalSubOwed: number
  netRunway: number
  awaitingClientApproval: number
  next14DayOutflow: number
  cashFronting: number
  isCashCrunch: boolean
}

function daysUntil(isoDate: string, from = new Date()): number {
  const due = new Date(isoDate + 'T12:00:00')
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return Math.round((dueDay.getTime() - today.getTime()) / MS_PER_DAY)
}

export function computeMetrics(
  milestoneItems: CashflowItem[],
  billItems: CashflowItem[],
  referenceDate = new Date(),
): CashflowMetrics {
  const fundsCollected = milestoneItems
    .filter((m) => m.status === 'paid')
    .reduce((sum, m) => sum + m.amount, 0)

  const awaitingClientApproval = milestoneItems
    .filter((m) => m.status === 'invoiced')
    .reduce((sum, m) => sum + m.amount, 0)

  const guaranteedIncoming = 0

  const totalSubOwed = billItems
    .filter((b) => b.status === 'unpaid')
    .reduce((sum, b) => sum + b.amount, 0)

  const next14DayOutflow = billItems
    .filter((b) => {
      if (b.status !== 'unpaid' || !b.dueDate) return false
      const days = daysUntil(b.dueDate, referenceDate)
      return days >= 0 && days <= 14
    })
    .reduce((sum, b) => sum + b.amount, 0)

  const netRunway = fundsCollected + guaranteedIncoming - totalSubOwed
  const cashFronting = Math.max(0, totalSubOwed - fundsCollected)

  return {
    fundsCollected,
    guaranteedIncoming,
    totalSubOwed,
    netRunway,
    awaitingClientApproval,
    next14DayOutflow,
    cashFronting,
    isCashCrunch: fundsCollected < totalSubOwed,
  }
}
