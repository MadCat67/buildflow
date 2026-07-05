import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './schema.js'
import { projects } from './schema.js'
import { milestones } from './cashflowSchema.js'

export const reminderSettings = pgTable('reminder_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  autoRemindersEnabled: boolean('auto_reminders_enabled').notNull().default(true),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  smsEnabled: boolean('sms_enabled').notNull().default(true),
  daysBeforeDue: text('days_before_due').notNull().default('3,1'),
  escrowEnabled: boolean('escrow_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const paymentReminderLog = pgTable('payment_reminder_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  milestoneId: uuid('milestone_id')
    .notNull()
    .references(() => milestones.id, { onDelete: 'cascade' }),
  tone: text('tone').notNull().$type<'gentle' | 'reminder' | 'firm'>(),
  channel: text('channel').notNull().$type<'email' | 'sms' | 'both'>(),
  messagePreview: text('message_preview').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
})

export const milestonePreauth = pgTable('milestone_preauth', {
  id: uuid('id').primaryKey().defaultRandom(),
  milestoneId: uuid('milestone_id')
    .notNull()
    .references(() => milestones.id, { onDelete: 'cascade' })
    .unique(),
  status: text('status')
    .notNull()
    .$type<'pending' | 'authorized' | 'released'>()
    .default('pending'),
  paymentMethod: text('payment_method').$type<'card' | 'ach'>(),
  clientLast4: text('client_last4'),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
