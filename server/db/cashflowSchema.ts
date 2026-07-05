import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { projects } from './schema.js'

export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  stageName: text('stage_name').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull().$type<'paid' | 'invoiced' | 'pending'>(),
  completedDate: text('completed_date'),
  dueDate: text('due_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const subcontractorBills = pgTable('subcontractor_bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  trade: text('trade').notNull(),
  amount: integer('amount').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').notNull().$type<'paid' | 'unpaid'>(),
  linkedStage: text('linked_stage').notNull(),
  milestoneId: uuid('milestone_id').references(() => milestones.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Milestone = typeof milestones.$inferSelect
export type SubcontractorBill = typeof subcontractorBills.$inferSelect
