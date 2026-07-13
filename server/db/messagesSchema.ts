import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './schema.js'
import { projects } from './schema.js'

export const messageContacts = pgTable('message_contacts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  gmailAccessToken: text('gmail_access_token'),
  gmailRefreshToken: text('gmail_refresh_token'),
  gmailExpiresAt: timestamp('gmail_expires_at', { withTimezone: true }),
  gmailStatus: text('gmail_status').default('not_connected'),
  lastGmailSyncAt: timestamp('last_gmail_sync_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const inboxMessages = pgTable(
  'inbox_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    externalId: text('external_id'),
    channel: text('channel').notNull(),
    clientName: text('client_name').notNull(),
    clientEmail: text('client_email'),
    clientPhone: text('client_phone'),
    senderAddress: text('sender_address'),
    subject: text('subject'),
    body: text('body').notNull(),
    status: text('status').notNull().default('pending'),
    aiDraft: text('ai_draft'),
    draftBody: text('draft_body'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    externalUnique: uniqueIndex('IDX_inbox_messages_user_external').on(
      table.userId,
      table.externalId,
    ),
  }),
)

export type InboxMessage = typeof inboxMessages.$inferSelect
export type MessageContact = typeof messageContacts.$inferSelect
