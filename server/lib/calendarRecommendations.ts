import type { Project } from '../db/schema.js'
import type { InboxMessage } from '../db/messagesSchema.js'
import { milestones } from '../db/cashflowSchema.js'

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
  messageId?: string
}

function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function findMilestoneByKeyword(
  milestoneRows: (typeof milestones.$inferSelect)[],
  keywords: string[],
) {
  return milestoneRows.find((m) =>
    keywords.some((kw) => m.stageName.toLowerCase().includes(kw)),
  )
}

function buildRecommendationFromMessage(
  msg: InboxMessage,
  project: Project | null,
  milestoneRows: (typeof milestones.$inferSelect)[],
): CalendarRecommendation | null {
  const body = msg.body.toLowerCase()
  const projectName = project?.name ?? 'Project'
  const clientName = msg.clientName

  if (
    body.includes('finish') ||
    body.includes('done') ||
    body.includes('august') ||
    body.includes('timeline') ||
    body.includes('visiting')
  ) {
    const milestone =
      findMilestoneByKeyword(milestoneRows, ['final', 'walkthrough', 'punch']) ??
      milestoneRows.find((m) => m.status === 'pending')

    if (!milestone) return null

    const currentDate = milestone.dueDate
    const suggestedDate = currentDate ? addDays(currentDate, -5) : null

    return {
      id: `rec-msg-${msg.id}`,
      messageId: msg.id,
      projectName,
      clientName,
      sourceMessage: msg.body.slice(0, 120),
      suggestion: `Move "${milestone.stageName}" earlier to accommodate client timeline request.`,
      currentDate,
      suggestedDate,
      milestoneName: milestone.stageName,
      priority: 'high',
      status: 'pending',
    }
  }

  if (body.includes('invoice') || body.includes('framing')) {
    const milestone =
      findMilestoneByKeyword(milestoneRows, ['rough', 'plumb', 'electrical']) ??
      findMilestoneByKeyword(milestoneRows, ['framing'])

    if (!milestone) return null

    const currentDate = milestone.dueDate
    const suggestedDate = currentDate ? addDays(currentDate, -7) : null

    return {
      id: `rec-msg-${msg.id}`,
      messageId: msg.id,
      projectName,
      clientName,
      sourceMessage: msg.body.slice(0, 120),
      suggestion: `Accelerate "${milestone.stageName}" to keep pace after framing paperwork.`,
      currentDate,
      suggestedDate,
      milestoneName: milestone.stageName,
      priority: 'medium',
      status: 'pending',
    }
  }

  if (
    body.includes('arrive') ||
    body.includes('crew') ||
    body.includes('tomorrow')
  ) {
    const milestone =
      findMilestoneByKeyword(milestoneRows, ['install', 'tile', 'rough']) ??
      milestoneRows.find((m) => m.status === 'pending')

    const tomorrow = addDays(new Date().toISOString().slice(0, 10), 1)

    return {
      id: `rec-msg-${msg.id}`,
      messageId: msg.id,
      projectName,
      clientName,
      sourceMessage: msg.body.slice(0, 120),
      suggestion: 'Add a calendar hold for 7:30 AM crew arrival and notify client 15 min before.',
      currentDate: milestone?.dueDate ?? null,
      suggestedDate: tomorrow,
      milestoneName: milestone?.stageName ?? 'Crew arrival',
      priority: 'medium',
      status: 'pending',
    }
  }

  return null
}

export function buildRecommendationsFromInbox(
  messages: InboxMessage[],
  userProjects: Project[],
  milestoneRows: (typeof milestones.$inferSelect)[],
  appliedIds: Set<string>,
): CalendarRecommendation[] {
  const projectMap = new Map(userProjects.map((p) => [p.id, p]))
  const recommendations: CalendarRecommendation[] = []

  for (const msg of messages) {
    const project = msg.projectId ? projectMap.get(msg.projectId) ?? null : null
    const projectMilestones = msg.projectId
      ? milestoneRows.filter((m) => m.projectId === msg.projectId)
      : milestoneRows

    const rec = buildRecommendationFromMessage(msg, project, projectMilestones)
    if (!rec) continue

    recommendations.push({
      ...rec,
      status: appliedIds.has(rec.id) ? 'applied' : rec.status,
    })
  }

  return recommendations.slice(0, 10)
}

export function findProjectForRecommendation(
  userProjects: Project[],
  rec: CalendarRecommendation,
) {
  return userProjects.find(
    (p) =>
      p.name === rec.projectName ||
      p.name.includes(rec.projectName) ||
      rec.projectName.includes(p.name.replace(/^\$[\d,]+\s+/, '')),
  )
}

export function findMilestoneForRecommendation(
  milestoneRows: (typeof milestones.$inferSelect)[],
  rec: CalendarRecommendation,
  projectId: string,
) {
  return milestoneRows.find(
    (m) =>
      m.projectId === projectId &&
      (m.stageName === rec.milestoneName ||
        m.stageName.includes(rec.milestoneName) ||
        rec.milestoneName.includes(m.stageName)),
  )
}
