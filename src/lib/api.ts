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
  milestoneId?: string | null
  payWhenPaidStatus?: 'paid' | 'payable' | 'held' | 'unpaid'
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

export type ProjectCashflow = {
  project: Project
  milestones: Milestone[]
  bills: SubcontractorBill[]
  phaseRunway?: PhaseRunway[]
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

export type ReminderSettings = {
  autoRemindersEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  daysBeforeDue: string
  escrowEnabled: boolean
}

export type ReminderLogEntry = {
  id: string
  milestoneId: string
  projectId: string
  tone: 'gentle' | 'reminder' | 'firm'
  channel: 'email' | 'sms' | 'both'
  messagePreview: string
  sentAt: string
}

export type RemindersData = {
  settings: ReminderSettings
  log: ReminderLogEntry[]
  templates: {
    gentle: { emailSubject: string; emailBody: string; smsBody: string }
    reminder: { emailSubject: string; emailBody: string; smsBody: string }
    firm: { emailSubject: string; emailBody: string; smsBody: string }
  }
  escalationSchedule: { days: number; tone: string; label: string }[]
}

export async function getReminders(): Promise<RemindersData> {
  return request('/reminders')
}

export async function updateReminderSettings(
  settings: Partial<ReminderSettings>,
): Promise<{ settings: ReminderSettings }> {
  return request('/reminders/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
}

export async function runRemindersNow(): Promise<{
  success: boolean
  sentCount: number
  message: string
}> {
  return request('/reminders/run-now', { method: 'POST' })
}

export type AppSettings = {
  company: {
    companyName: string
    businessPhone: string
  }
  notifications: ReminderSettings
  integrations: {
    googleCalendar: 'connected' | 'not_connected'
    outlookCalendar: 'connected' | 'not_connected'
    emailDelivery: 'configured' | 'not_configured'
    smsDelivery: 'configured' | 'not_configured'
    quickbooks: 'not_connected'
  }
}

export async function getSettings(): Promise<AppSettings> {
  return request('/settings')
}

export async function updateSettings(input: {
  companyName?: string
  businessPhone?: string
  notifications?: Partial<ReminderSettings>
}): Promise<AppSettings> {
  return request('/settings', {
    method: 'PATCH',
    body: JSON.stringify({
      companyName: input.companyName,
      businessPhone: input.businessPhone,
      notifications: input.notifications,
    }),
  })
}

export type SubcontractorRecord = {
  id: string
  projectId: string
  projectName: string
  name: string
  email: string
  phone: string | null
  trade: string
  portalUrl: string
  createdAt: string
}

export type SubInvoiceSubmission = {
  id: string
  subcontractorId: string
  projectId: string
  projectName: string
  linkedStage: string
  amount: number
  description: string | null
  status: 'pending_review' | 'approved' | 'rejected' | 'paid'
  createdAt: string
}

export async function getSubcontractors(): Promise<{
  subcontractors: SubcontractorRecord[]
  submissions: SubInvoiceSubmission[]
}> {
  return request('/subcontractors')
}

export async function inviteSubcontractor(input: {
  projectId: string
  name: string
  email: string
  phone?: string
  trade: string
}): Promise<{ subcontractor: { id: string; portalUrl: string; name: string; trade: string } }> {
  return request('/subcontractors', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function approveSubSubmission(
  id: string,
): Promise<{ success: boolean; billId: string }> {
  return request(`/subcontractors/submissions/${id}/approve`, { method: 'POST' })
}

export async function rejectSubSubmission(id: string): Promise<{ success: boolean }> {
  return request(`/subcontractors/submissions/${id}/reject`, { method: 'POST' })
}

export async function getSubPortal(token: string): Promise<{
  subcontractor: { name: string; trade: string }
  project: { name: string; clientName: string }
  milestones: { id: string; stageName: string; status: string; amount: number }[]
  submissions: { id: string; linkedStage: string; amount: number; status: string }[]
}> {
  return request(`/portal/sub/${token}`)
}

export async function submitSubInvoice(
  token: string,
  input: {
    linkedStage: string
    milestoneId?: string
    amount: number
    description?: string
  },
): Promise<{ submission: { id: string; status: string } }> {
  return request(`/portal/sub/${token}/invoices`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type InboxMessage = {
  id: string
  projectId: string | null
  projectName: string
  clientName: string
  channel: 'email' | 'sms'
  body: string
  subject: string | null
  receivedAt: string
  receivedAtIso: string
  status: 'pending' | 'approved' | 'sent'
  aiDraft: string
  draftBody: string
  clientEmail: string | null
  clientPhone: string | null
}

export type MessagesData = {
  contact: { email: string; phone: string }
  integrations: {
    gmail: 'connected' | 'not_connected'
    emailSend: 'configured' | 'not_configured'
    smsSend: 'configured' | 'not_configured'
    ai: 'configured' | 'fallback'
    lastGmailSyncAt: string | null
  }
  messages: InboxMessage[]
}

export async function getMessages(): Promise<MessagesData> {
  return request('/messages')
}

export async function updateMessageContact(input: {
  email?: string
  phone?: string
}): Promise<{ contact: { email: string; phone: string } }> {
  return request('/messages/contact', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function syncMessages(): Promise<{
  success: boolean
  seeded: number
  gmailSynced: number
  gmailConnected: boolean
}> {
  return request('/messages/sync', { method: 'POST' })
}

export function getGmailAuthUrl(): string {
  const serverUrl = import.meta.env.VITE_SERVER_URL as string | undefined
  if (serverUrl) {
    return `${serverUrl.replace(/\/$/, '')}/api/messages/oauth/gmail`
  }
  return `${API_BASE}/messages/oauth/gmail`
}

export async function regenerateMessageDraft(
  id: string,
): Promise<{ message: { aiDraft: string; draftBody: string } }> {
  return request(`/messages/${id}/draft`, { method: 'POST' })
}

export async function saveMessageDraft(
  id: string,
  draftBody: string,
): Promise<{ draftBody: string }> {
  return request(`/messages/${id}/draft`, {
    method: 'PATCH',
    body: JSON.stringify({ draftBody }),
  })
}

export async function approveMessage(
  id: string,
): Promise<{ status: string }> {
  return request(`/messages/${id}/approve`, { method: 'POST' })
}

export async function sendMessage(
  id: string,
): Promise<{
  success: boolean
  status: string
  emailSent: boolean
  smsSent: boolean
  warnings: string[]
}> {
  return request(`/messages/${id}/send`, { method: 'POST' })
}
