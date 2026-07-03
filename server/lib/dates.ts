const MS_PER_DAY = 86_400_000

export function daysUntil(isoDate: string, from = new Date()): number {
  const due = new Date(isoDate + 'T12:00:00')
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return Math.round((dueDay.getTime() - today.getTime()) / MS_PER_DAY)
}

export function isMilestoneOverdue(
  status: string,
  dueDate: string | null | undefined,
  from = new Date(),
): boolean {
  if (status === 'paid' || !dueDate) return false
  return daysUntil(dueDate, from) < 0
}

export function isBillOverdue(
  status: string,
  dueDate: string,
  from = new Date(),
): boolean {
  if (status === 'paid') return false
  return daysUntil(dueDate, from) < 0
}
