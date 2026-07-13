import { Router } from 'express'
import { and, eq } from 'drizzle-orm'
import crypto from 'crypto'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'
import { milestones } from '../db/cashflowSchema.js'
import {
  appliedCalendarRecommendations,
  calendarConnections,
  calendarFeedTokens,
  milestoneCalendarEvents,
} from '../db/calendarSchema.js'
import { buildIcalFeed } from '../lib/ical.js'
import {
  syncAllUserMilestonesToCalendars,
  syncMilestoneToCalendars,
} from '../lib/calendarSync.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getScheduleMessagesForUser } from '../lib/inboxSync.js'
import {
  buildRecommendationsFromInbox,
  findMilestoneForRecommendation as matchMilestoneForRec,
  findProjectForRecommendation as matchProjectForRec,
} from '../lib/calendarRecommendations.js'

const router = Router()

const SERVER_URL = (process.env.SERVER_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
)

router.get('/feed/:token.ics', async (req, res, next) => {
  try {
    const token = req.params.token.replace(/\.ics$/, '')

    const [feed] = await db
      .select()
      .from(calendarFeedTokens)
      .where(eq(calendarFeedTokens.token, token))
      .limit(1)

    if (!feed) {
      res.status(404).send('Calendar feed not found')
      return
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, feed.userId))

    const projectIds = userProjects.map((p) => p.id)
    if (projectIds.length === 0) {
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="buildflow.ics"')
      res.send(buildIcalFeed([]))
      return
    }

    const milestoneRows = await db.select().from(milestones)
    const projectMap = new Map(userProjects.map((p) => [p.id, p]))

    const events = milestoneRows
      .filter((m) => projectIds.includes(m.projectId))
      .map((m) => {
        const project = projectMap.get(m.projectId)
        if (!project) return null
        const date = m.dueDate ?? m.completedDate
        if (!date) return null
        return {
          uid: `milestone-${m.id}@buildflow`,
          summary: `${project.name} — ${m.stageName}`,
          description: [
            `Client: ${project.clientName}`,
            `Milestone: ${m.stageName}`,
            `Amount: $${m.amount.toLocaleString()}`,
            `Status: ${m.status}`,
          ].join('\n'),
          date,
          location: project.address,
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="buildflow.ics"')
    res.setHeader('Cache-Control', 'no-cache, max-age=3600')
    res.send(buildIcalFeed(events))
  } catch (error) {
    next(error)
  }
})

router.get('/oauth/google/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string }
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(
      /\/$/,
      '',
    )

    if (
      !code ||
      !state ||
      state !== req.session.calendarOAuthState ||
      !req.session.calendarOAuthUserId
    ) {
      res.redirect(`${clientUrl}/dashboard/calendar?error=oauth_failed`)
      return
    }

    const userId = req.session.calendarOAuthUserId
    delete req.session.calendarOAuthState
    delete req.session.calendarOAuthUserId

    const clientId = process.env.GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
    const redirectUri = `${SERVER_URL}/api/calendar/oauth/google/callback`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      res.redirect(`${clientUrl}/dashboard/calendar?error=token_failed`)
      return
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const [existing] = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, userId),
          eq(calendarConnections.provider, 'google'),
        ),
      )
      .limit(1)

    if (existing) {
      await db
        .update(calendarConnections)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? existing.refreshToken,
          expiresAt,
          status: 'connected',
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing.id))
    } else {
      await db.insert(calendarConnections).values({
        userId,
        provider: 'google',
        calendarId: 'primary',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        status: 'connected',
      })
    }

    res.redirect(`${clientUrl}/dashboard/calendar?connected=google`)

    syncAllUserMilestonesToCalendars(userId).catch((err) => {
      console.error('Initial calendar sync failed:', err)
    })
  } catch (error) {
    next(error)
  }
})

router.use(requireAuth)

async function ensureFeedToken(userId: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(calendarFeedTokens)
    .where(eq(calendarFeedTokens.userId, userId))
    .limit(1)

  if (existing) return existing.token

  const token = crypto.randomBytes(24).toString('hex')
  await db.insert(calendarFeedTokens).values({ userId, token })
  return token
}

const AI_RECOMMENDATIONS_FALLBACK = [
  {
    id: 'rec-1',
    projectName: 'Kitchen Renovation',
    clientName: 'Sarah Johnson',
    sourceMessage:
      'We have family visiting mid-August and want to plan around the kitchen being done.',
    suggestion:
      'Move "Final Walkthrough & Punch List" to Aug 15 and add a buffer day before client visit.',
    currentDate: '2026-08-20',
    suggestedDate: '2026-08-15',
    milestoneName: 'Final Walkthrough & Punch List',
    priority: 'high' as const,
    status: 'pending' as const,
  },
  {
    id: 'rec-2',
    projectName: 'Kitchen Renovation',
    clientName: 'Sarah Johnson',
    sourceMessage: 'Can you send the framing invoice? Need it for our records.',
    suggestion:
      'Move rough-in start earlier to keep pace after framing paperwork.',
    currentDate: '2026-07-15',
    suggestedDate: '2026-07-08',
    milestoneName: 'Rough-In Plumbing & Electrical',
    priority: 'medium' as const,
    status: 'pending' as const,
  },
  {
    id: 'rec-3',
    projectName: 'Bathroom Remodel',
    clientName: 'Mike & Lisa Chen',
    sourceMessage: 'What time will the crew arrive tomorrow?',
    suggestion:
      'Add a calendar hold for 7:30 AM crew arrival and notify client 15 min before.',
    currentDate: null,
    suggestedDate: '2026-07-04',
    milestoneName: 'Tile Installation',
    priority: 'medium' as const,
    status: 'pending' as const,
  },
]

async function getRecommendationsForUser(
  userId: string,
  userProjects: (typeof projects.$inferSelect)[],
  milestoneRows: (typeof milestones.$inferSelect)[],
  appliedIds: Set<string>,
) {
  const inboxMessages = await getScheduleMessagesForUser(userId)
  const fromInbox = buildRecommendationsFromInbox(
    inboxMessages,
    userProjects,
    milestoneRows,
    appliedIds,
  )

  if (fromInbox.length > 0) return fromInbox

  return AI_RECOMMENDATIONS_FALLBACK.map((rec) => ({
    ...rec,
    status: appliedIds.has(rec.id) ? ('applied' as const) : rec.status,
  }))
}

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id
    const token = await ensureFeedToken(userId)
    const feedUrl = `${SERVER_URL}/api/calendar/feed/${token}.ics`

    const connections = (await db
      .select({
        id: calendarConnections.id,
        provider: calendarConnections.provider,
        calendarId: calendarConnections.calendarId,
        status: calendarConnections.status,
        updatedAt: calendarConnections.updatedAt,
      })
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId))).map((c) => ({
      ...c,
      updatedAt: c.updatedAt.toISOString(),
    }))

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))

    const projectIds = userProjects.map((p) => p.id)
    const projectMap = new Map(userProjects.map((p) => [p.id, p]))

    const milestoneRows =
      projectIds.length > 0
        ? await db.select().from(milestones)
        : []

    const mappings = await db.select().from(milestoneCalendarEvents)

    const events = milestoneRows
      .filter((m) => projectIds.includes(m.projectId))
      .map((m) => {
        const project = projectMap.get(m.projectId)!
        const date = m.dueDate ?? m.completedDate
        const syncedProviders = mappings
          .filter((map) => map.milestoneId === m.id)
          .map((map) => map.provider)
        return {
          id: m.id,
          projectId: m.projectId,
          projectName: project.name,
          clientName: project.clientName,
          stageName: m.stageName,
          dueDate: m.dueDate,
          completedDate: m.completedDate,
          displayDate: date,
          status: m.status,
          syncedProviders,
        }
      })
      .filter((e) => e.displayDate)
      .sort((a, b) => (a.displayDate! < b.displayDate! ? -1 : 1))

    const applied = await db
      .select({ recommendationId: appliedCalendarRecommendations.recommendationId })
      .from(appliedCalendarRecommendations)
      .where(eq(appliedCalendarRecommendations.userId, userId))

    const appliedIds = new Set(applied.map((a) => a.recommendationId))

    const recommendations = await getRecommendationsForUser(
      userId,
      userProjects,
      milestoneRows,
      appliedIds,
    )

    res.json({
      feedUrl,
      googleCalendarSubscribeUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`,
      connections,
      events,
      recommendations,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/oauth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    res.status(500).json({ error: 'Google OAuth is not configured' })
    return
  }

  const redirectUri = `${SERVER_URL}/api/calendar/oauth/google/callback`
  const state = crypto.randomBytes(16).toString('hex')
  req.session.calendarOAuthState = state
  req.session.calendarOAuthUserId = req.user!.id

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

router.post('/sync-all', async (req, res, next) => {
  try {
    await syncAllUserMilestonesToCalendars(req.user!.id)
    res.json({ success: true, message: 'All milestones synced to connected calendars' })
  } catch (error) {
    next(error)
  }
})

router.post('/disconnect', async (req, res, next) => {
  try {
    const { provider } = req.body as { provider?: 'google' | 'outlook' }
    if (!provider || !['google', 'outlook'].includes(provider)) {
      res.status(400).json({ error: 'Invalid provider' })
      return
    }

    await db
      .delete(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, req.user!.id),
          eq(calendarConnections.provider, provider),
        ),
      )

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.post('/recommendations/:id/apply', async (req, res, next) => {
  try {
    const userId = req.user!.id

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))

    const projectIds = userProjects.map((p) => p.id)
    const milestoneRows =
      projectIds.length > 0 ? await db.select().from(milestones) : []

    const applied = await db
      .select({ recommendationId: appliedCalendarRecommendations.recommendationId })
      .from(appliedCalendarRecommendations)
      .where(eq(appliedCalendarRecommendations.userId, userId))

    const appliedIds = new Set(applied.map((a) => a.recommendationId))
    const recommendations = await getRecommendationsForUser(
      userId,
      userProjects,
      milestoneRows,
      appliedIds,
    )

    const rec = recommendations.find((r) => r.id === req.params.id)
    if (!rec || !rec.suggestedDate) {
      res.status(404).json({ error: 'Recommendation not found' })
      return
    }

    const [alreadyApplied] = await db
      .select()
      .from(appliedCalendarRecommendations)
      .where(
        and(
          eq(appliedCalendarRecommendations.userId, userId),
          eq(appliedCalendarRecommendations.recommendationId, rec.id),
        ),
      )
      .limit(1)

    if (alreadyApplied) {
      res.status(409).json({ error: 'This recommendation was already applied' })
      return
    }

    const project = matchProjectForRec(userProjects, rec)
    if (!project) {
      res.status(404).json({
        error: `Project "${rec.projectName}" not found. Add the sample kitchen project first.`,
      })
      return
    }

    const projectMilestones = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, project.id))

    const milestone = matchMilestoneForRec(projectMilestones, rec, project.id)
    if (!milestone) {
      res.status(404).json({
        error: `Milestone "${rec.milestoneName}" not found on ${project.name}`,
      })
      return
    }

    const [updated] = await db
      .update(milestones)
      .set({ dueDate: rec.suggestedDate })
      .where(eq(milestones.id, milestone.id))
      .returning()

    await syncMilestoneToCalendars(userId, updated, project)

    await db.insert(appliedCalendarRecommendations).values({
      userId,
      recommendationId: rec.id,
      milestoneId: milestone.id,
    })

    const googleConnected = await db
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

    const syncNote = googleConnected.length
      ? 'Synced to your Google Calendar.'
      : 'Connect Google Calendar for instant updates (iCal feed refreshes periodically).'

    res.json({
      success: true,
      message: `Moved "${rec.milestoneName}" to ${rec.suggestedDate}. ${syncNote}`,
      suggestedDate: rec.suggestedDate,
      milestoneName: rec.milestoneName,
      projectId: project.id,
      milestoneId: milestone.id,
    })
  } catch (error) {
    next(error)
  }
})

export default router
