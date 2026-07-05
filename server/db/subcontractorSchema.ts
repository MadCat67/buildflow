import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { projects } from './schema.js'
import { users } from './schema.js'
import { milestones } from './cashflowSchema.js'

export const subcontractors = pgTable('subcontractors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  trade: text('trade').notNull(),
  portalToken: text('portal_token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const subInvoiceSubmissions = pgTable('sub_invoice_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subcontractorId: uuid('subcontractor_id')
    .notNull()
    .references(() => subcontractors.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  milestoneId: uuid('milestone_id').references(() => milestones.id, {
    onDelete: 'set null',
  }),
  linkedStage: text('linked_stage').notNull(),
  amount: integer('amount').notNull(),
  description: text('description'),
  status: text('status')
    .notNull()
    .$type<'pending_review' | 'approved' | 'rejected' | 'paid'>()
    .default('pending_review'),
  billId: uuid('bill_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
