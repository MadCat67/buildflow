import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './schema.js'
import { milestones } from './cashflowSchema.js'

export const calendarFeedTokens = pgTable('calendar_feed_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const calendarConnections = pgTable('calendar_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().$type<'google' | 'outlook'>(),
  calendarId: text('calendar_id').notNull().default('primary'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  status: text('status').notNull().$type<'connected' | 'error'>().default('connected'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const milestoneCalendarEvents = pgTable('milestone_calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  milestoneId: uuid('milestone_id')
    .notNull()
    .references(() => milestones.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().$type<'google' | 'outlook'>(),
  externalEventId: text('external_event_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const appliedCalendarRecommendations = pgTable('applied_calendar_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recommendationId: text('recommendation_id').notNull(),
  milestoneId: uuid('milestone_id').references(() => milestones.id, {
    onDelete: 'set null',
  }),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
})

export type CalendarFeedToken = typeof calendarFeedTokens.$inferSelect
export type CalendarConnection = typeof calendarConnections.$inferSelect
export type MilestoneCalendarEvent = typeof milestoneCalendarEvents.$inferSelect
