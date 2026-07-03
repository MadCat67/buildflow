import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'
import { milestones } from '../db/cashflowSchema.js'
import {
  calendarConnections,
  milestoneCalendarEvents,
} from '../db/calendarSchema.js'
import type { Milestone } from '../db/cashflowSchema.js'
import type { Project } from '../db/schema.js'

type SyncAction = 'upsert' | 'delete'

type MilestoneLike = {
  id: string
  stageName: string
  amount: number
  status: string
  dueDate: string | null
  completedDate: string | null
}

type ProjectLike = {
  name: string
  clientName: string
  address: string | null
}

function eventDate(milestone: MilestoneLike): string | null {
  return milestone.dueDate ?? milestone.completedDate
}

function buildEventPayload(milestone: MilestoneLike, project: ProjectLike) {
  const date = eventDate(milestone)
  if (!date) return null

  return {
    summary: `${project.name} — ${milestone.stageName}`,
    description: [
      `Client: ${project.clientName}`,
      `Milestone: ${milestone.stageName}`,
      `Amount: $${milestone.amount.toLocaleString()}`,
      `Status: ${milestone.status}`,
      '',
      'Synced from BuildFlow',
    ].join('\n'),
    date,
    location: project.address,
  }
}

async function refreshGoogleAccessToken(connection: {
  id: string
  refreshToken: string | null
  accessToken: string | null
}): Promise<string | null> {
  if (!connection.refreshToken) return connection.accessToken

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  await db
    .update(calendarConnections)
    .set({
      accessToken: data.access_token,
      expiresAt,
      updatedAt: new Date(),
      status: 'connected',
    })
    .where(eq(calendarConnections.id, connection.id))

  return data.access_token
}

async function getGoogleAccessToken(connection: {
  id: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: Date | null
}): Promise<string | null> {
  if (
    connection.accessToken &&
    connection.expiresAt &&
    connection.expiresAt.getTime() > Date.now() + 60_000
  ) {
    return connection.accessToken
  }
  return refreshGoogleAccessToken(connection)
}

async function syncGoogleEvent(
  userId: string,
  milestone: MilestoneLike,
  project: ProjectLike,
  action: SyncAction,
): Promise<void> {
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, 'google'),
        eq(calendarConnections.status, 'connected'),
      ),
    )
    .limit(1)

  if (!connection?.accessToken && !connection?.refreshToken) return

  const accessToken = await getGoogleAccessToken(connection)
  if (!accessToken) {
    await db
      .update(calendarConnections)
      .set({ status: 'error', updatedAt: new Date() })
      .where(eq(calendarConnections.id, connection.id))
    return
  }

  const calendarId = encodeURIComponent(connection.calendarId || 'primary')
  const [mapping] = await db
    .select()
    .from(milestoneCalendarEvents)
    .where(
      and(
        eq(milestoneCalendarEvents.milestoneId, milestone.id),
        eq(milestoneCalendarEvents.provider, 'google'),
      ),
    )
    .limit(1)

  if (action === 'delete') {
    if (!mapping) return
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(mapping.externalEventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )
    await db
      .delete(milestoneCalendarEvents)
      .where(eq(milestoneCalendarEvents.id, mapping.id))
    return
  }

  const payload = buildEventPayload(milestone, project)
  if (!payload) {
    if (mapping) {
      await syncGoogleEvent(userId, milestone, project, 'delete')
    }
    return
  }

  const endDate = addDays(payload.date, 1)
  const body = {
    summary: payload.summary,
    description: payload.description,
    location: payload.location ?? undefined,
    start: { date: payload.date },
    end: { date: endDate },
  }

  if (mapping) {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(mapping.externalEventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    )

    if (res.ok) {
      await db
        .update(milestoneCalendarEvents)
        .set({ updatedAt: new Date() })
        .where(eq(milestoneCalendarEvents.id, mapping.id))
      return
    }

    if (res.status === 404) {
      await db
        .delete(milestoneCalendarEvents)
        .where(eq(milestoneCalendarEvents.id, mapping.id))
    } else {
      console.error('Google Calendar PATCH failed:', res.status, await res.text())
      return
    }
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    console.error('Google Calendar POST failed:', res.status, await res.text())
    return
  }

  const created = (await res.json()) as { id: string }
  await db.insert(milestoneCalendarEvents).values({
    milestoneId: milestone.id,
    provider: 'google',
    externalEventId: created.id,
  })
}

async function syncOutlookEvent(
  userId: string,
  milestone: MilestoneLike,
  project: ProjectLike,
  action: SyncAction,
): Promise<void> {
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, 'outlook'),
        eq(calendarConnections.status, 'connected'),
      ),
    )
    .limit(1)

  if (!connection?.accessToken) return

  const [mapping] = await db
    .select()
    .from(milestoneCalendarEvents)
    .where(
      and(
        eq(milestoneCalendarEvents.milestoneId, milestone.id),
        eq(milestoneCalendarEvents.provider, 'outlook'),
      ),
    )
    .limit(1)

  if (action === 'delete') {
    if (!mapping) return
    await fetch(`https://graph.microsoft.com/v1.0/me/events/${mapping.externalEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${connection.accessToken}` },
    })
    await db
      .delete(milestoneCalendarEvents)
      .where(eq(milestoneCalendarEvents.id, mapping.id))
    return
  }

  const payload = buildEventPayload(milestone, project)
  if (!payload) {
    if (mapping) {
      await syncOutlookEvent(userId, milestone, project, 'delete')
    }
    return
  }

  const body = {
    subject: payload.summary,
    body: { contentType: 'Text', content: payload.description },
    start: { dateTime: `${payload.date}T09:00:00`, timeZone: 'America/Los_Angeles' },
    end: { dateTime: `${payload.date}T17:00:00`, timeZone: 'America/Los_Angeles' },
    location: payload.location
      ? { displayName: payload.location }
      : undefined,
    isAllDay: true,
  }

  if (mapping) {
    await fetch(`https://graph.microsoft.com/v1.0/me/events/${mapping.externalEventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    return
  }

  const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) return

  const created = (await res.json()) as { id: string }
  await db.insert(milestoneCalendarEvents).values({
    milestoneId: milestone.id,
    provider: 'outlook',
    externalEventId: created.id,
  })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function syncMilestoneToCalendars(
  userId: string,
  milestone: Milestone | MilestoneLike,
  project: Project | ProjectLike,
  action: SyncAction = 'upsert',
): Promise<void> {
  try {
    await Promise.all([
      syncGoogleEvent(userId, milestone, project, action),
      syncOutlookEvent(userId, milestone, project, action),
    ])
  } catch (err) {
    console.error('Calendar sync failed:', err)
  }
}

export async function syncAllUserMilestonesToCalendars(
  userId: string,
): Promise<void> {
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))

  for (const project of userProjects) {
    const milestoneRows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, project.id))

    for (const milestone of milestoneRows) {
      await syncMilestoneToCalendars(userId, milestone, project)
    }
  }
}
