import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { reminderSettings } from '../db/remindersSchema.js'

export type ReminderSettingsPayload = {
  autoRemindersEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  daysBeforeDue: string
  escrowEnabled: boolean
}

export async function ensureReminderSettings(userId: string) {
  const [existing] = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.userId, userId))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(reminderSettings)
    .values({ userId })
    .returning()

  return created
}

export function toReminderSettingsResponse(
  row: typeof reminderSettings.$inferSelect,
): ReminderSettingsPayload {
  return {
    autoRemindersEnabled: row.autoRemindersEnabled,
    emailEnabled: row.emailEnabled,
    smsEnabled: row.smsEnabled,
    daysBeforeDue: row.daysBeforeDue,
    escrowEnabled: row.escrowEnabled,
  }
}

export async function patchReminderSettings(
  userId: string,
  input: Partial<ReminderSettingsPayload>,
): Promise<ReminderSettingsPayload> {
  await ensureReminderSettings(userId)

  const updates: Partial<typeof reminderSettings.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.autoRemindersEnabled !== undefined) {
    updates.autoRemindersEnabled = !!input.autoRemindersEnabled
    if (!input.autoRemindersEnabled) {
      updates.emailEnabled = false
      updates.smsEnabled = false
    }
  }
  if (input.emailEnabled !== undefined) updates.emailEnabled = !!input.emailEnabled
  if (input.smsEnabled !== undefined) updates.smsEnabled = !!input.smsEnabled
  if (input.daysBeforeDue !== undefined) {
    updates.daysBeforeDue = String(input.daysBeforeDue)
  }
  if (input.escrowEnabled !== undefined) updates.escrowEnabled = !!input.escrowEnabled

  const [updated] = await db
    .update(reminderSettings)
    .set(updates)
    .where(eq(reminderSettings.userId, userId))
    .returning()

  return toReminderSettingsResponse(updated)
}
