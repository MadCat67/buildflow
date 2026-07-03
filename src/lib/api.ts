import type {
  MilestoneStatus,
  SubBillStatus,
} from '../components/cashflow/types'

const API_BASE = '/api'

export type User = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export type Project = {
  id: string
  name: string
  clientName: string
  address: string | null
  clientEmail: string | null
  clientPhone: string | null
  contractValue: number
  isDemo: boolean
  createdAt: string
  updatedAt: string
  overdueInflows?: number
  overdueOutflows?: number
  hasOverdue?: boolean
}

export type Milestone = {
  id: string
  stageName: string
  amount: number
  status: MilestoneStatus
  completedDate: string | null
  dueDate: string | null
}

export type SubcontractorBill = {
  id: string
  trade: string
  amount: number
  dueDate: string
  status: SubBillStatus
  linkedStage: string
}

export type ProjectCashflow = {
  project: Project
  milestones: Milestone[]
  bills: SubcontractorBill[]
}

export type CompanyFinances = {
  totals: {
    fundsCollected: number
    awaitingClientApproval: number
    totalSubOwed: number
    netRunway: number
    next14DayOutflow: number
    cashFronting: number
    activeProjects: number
    projectsInCrunch: number
    projectsWithData: number
  }
  projects: {
    id: string
    name: string
    fundsCollected: number
    awaitingClientApproval: number
    totalSubOwed: number
    netRunway: number
    isCashCrunch: boolean
  }[]
}

export type CreateProjectInput = {
  name: string
  clientName: string
  address?: string
  clientEmail?: string
  clientPhone?: string
  contractValue: number
}

export type CalendarConnection = {
  id: string
  provider: 'google' | 'outlook'
  calendarId: string
  status: 'connected' | 'error'
  updatedAt: string
}

export type CalendarEvent = {
  id: string
  projectId: string
  projectName: string
  clientName: string
  stageName: string
  dueDate: string | null
  completedDate: string | null
  displayDate: string | null
  status: MilestoneStatus
  syncedProviders: ('google' | 'outlook')[]
}

export type CalendarRecommendation = {
  id: string
  projectName: string
  clientName: string
  sourceMessage: string
  suggestion: string
  currentDate: string | null
  suggestedDate: string | null
  milestoneName: string
  priority: 'high' | 'medium'
  status: 'pending' | 'applied'
}

export type CalendarData = {
  feedUrl: string
  googleCalendarSubscribeUrl: string
  connections: CalendarConnection[]
  events: CalendarEvent[]
  recommendations: CalendarRecommendation[]
}

export type UpdateProjectInput = {
  name?: string
  clientName?: string
  address?: string
  clientEmail?: string
  clientPhone?: string
  contractValue?: number
}

export type CreateMilestoneInput = {
  stageName: string
  amount: number
  status: MilestoneStatus
  completedDate?: string
  dueDate?: string
}

export type CreateBillInput = {
  trade: string
  amount: number
  dueDate: string
  status: SubBillStatus
  linkedStage: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ?? `API error: ${res.status}`,
    )
  }

  return res.json() as Promise<T>
}

export async function getMe(): Promise<{ user: User | null }> {
  try {
    return await request<{ user: User | null }>('/auth/me')
  } catch {
    return { user: null }
  }
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

export function getGoogleAuthUrl(): string {
  const serverUrl = import.meta.env.VITE_SERVER_URL as string | undefined
  if (serverUrl) {
    return `${serverUrl.replace(/\/$/, '')}/api/auth/google`
  }
  return `${API_BASE}/auth/google`
}

export async function getProjects(): Promise<{ projects: Project[] }> {
  return request('/projects')
}

export async function getProject(id: string): Promise<{ project: Project }> {
  return request(`/projects/${id}`)
}

export async function getProjectCashflow(id: string): Promise<ProjectCashflow> {
  return request(`/projects/${id}/cashflow`)
}

export async function getCompanyFinances(): Promise<CompanyFinances> {
  return request('/finances/company')
}

export async function getCalendar(): Promise<CalendarData> {
  return request('/calendar')
}

export async function disconnectCalendar(
  provider: 'google' | 'outlook',
): Promise<{ success: boolean }> {
  return request('/calendar/disconnect', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  })
}

export async function syncAllCalendars(): Promise<{ success: boolean; message: string }> {
  return request('/calendar/sync-all', { method: 'POST' })
}

export async function applyCalendarRecommendation(
  id: string,
): Promise<{
  success: boolean
  message: string
  suggestedDate: string
  milestoneName: string
}> {
  return request(`/calendar/recommendations/${id}/apply`, { method: 'POST' })
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<{ project: Project }> {
  return request(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function requestPayment(
  projectId: string,
  milestoneId: string,
  channels: ('email' | 'sms')[],
): Promise<{ success: boolean; emailSent: boolean; smsSent: boolean; warnings: string[] }> {
  return request(`/projects/${projectId}/milestones/${milestoneId}/request-payment`, {
    method: 'POST',
    body: JSON.stringify({ channels }),
  })
}

export async function createProject(
  input: CreateProjectInput,
): Promise<{ project: Project }> {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createDemoProject(): Promise<{ project: Project }> {
  return request('/projects/sample/demo', { method: 'POST' })
}

export async function createMilestone(
  projectId: string,
  input: CreateMilestoneInput,
): Promise<{ milestone: Milestone }> {
  return request(`/projects/${projectId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  input: Partial<CreateMilestoneInput>,
): Promise<{ milestone: Milestone }> {
  return request(`/projects/${projectId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteMilestone(
  projectId: string,
  milestoneId: string,
): Promise<void> {
  await request(`/projects/${projectId}/milestones/${milestoneId}`, {
    method: 'DELETE',
  })
}

export async function createBill(
  projectId: string,
  input: CreateBillInput,
): Promise<{ bill: SubcontractorBill }> {
  return request(`/projects/${projectId}/bills`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateBill(
  projectId: string,
  billId: string,
  input: Partial<CreateBillInput>,
): Promise<{ bill: SubcontractorBill }> {
  return request(`/projects/${projectId}/bills/${billId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteBill(
  projectId: string,
  billId: string,
): Promise<void> {
  await request(`/projects/${projectId}/bills/${billId}`, {
    method: 'DELETE',
  })
}
