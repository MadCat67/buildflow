export type MilestoneStatus = 'paid' | 'invoiced' | 'pending'
export type SubBillStatus = 'paid' | 'unpaid'
export type PayWhenPaidStatus = 'paid' | 'payable' | 'held' | 'unpaid'

export type ClientMilestone = {
  id: string
  stageName: string
  amount: number
  status: MilestoneStatus
  completedDate?: string
  dueDate?: string | null
}

export type SubcontractorBill = {
  id: string
  trade: string
  amount: number
  dueDate: string
  status: SubBillStatus
  linkedStage: string
  milestoneId?: string | null
  payWhenPaidStatus?: PayWhenPaidStatus
}

export type PhaseRunway = {
  milestoneId: string
  stageName: string
  milestoneStatus: MilestoneStatus
  clientIncoming: number
  clientCollected: number
  subOwed: number
  gap: number
  isCrunch: boolean
  crunchIn14Days: boolean
  linkedBillCount: number
}

export type ProjectCashFlow = {
  projectName: string
  projectValue: number
  clientName: string
  milestones: ClientMilestone[]
  subcontractorBills: SubcontractorBill[]
  phaseRunway?: PhaseRunway[]
}

export type CashFlowMetrics = {
  fundsCollected: number
  guaranteedIncoming: number
  totalSubOwed: number
  netRunway: number
  awaitingClientApproval: number
  next14DayOutflow: number
  cashFronting: number
  isCashCrunch: boolean
}
