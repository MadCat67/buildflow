import { pool } from './index.js'

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      google_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" VARCHAR NOT NULL COLLATE "default",
      "sess" JSON NOT NULL,
      "expire" TIMESTAMP(6) NOT NULL,
      PRIMARY KEY ("sid")
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      address TEXT,
      contract_value INTEGER NOT NULL,
      is_demo BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_projects_user_id" ON projects(user_id)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('paid', 'invoiced', 'pending')),
      completed_date TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subcontractor_bills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      trade TEXT NOT NULL,
      amount INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid')),
      linked_stage TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_milestones_project_id" ON milestones(project_id)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_bills_project_id" ON subcontractor_bills(project_id)
  `)

  await pool.query(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email TEXT
  `)
  await pool.query(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_phone TEXT
  `)
  await pool.query(`
    ALTER TABLE milestones ADD COLUMN IF NOT EXISTS due_date TEXT
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS calendar_feed_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS calendar_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
      calendar_id TEXT NOT NULL DEFAULT 'primary',
      access_token TEXT,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'error')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "IDX_calendar_connections_user_provider"
    ON calendar_connections(user_id, provider)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS milestone_calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
      external_event_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "IDX_milestone_calendar_events_milestone_provider"
    ON milestone_calendar_events(milestone_id, provider)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS applied_calendar_recommendations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recommendation_id TEXT NOT NULL,
      milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "IDX_applied_calendar_recs_user_rec"
    ON applied_calendar_recommendations(user_id, recommendation_id)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminder_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      auto_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      days_before_due TEXT NOT NULL DEFAULT '3,1',
      escrow_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_reminder_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      tone TEXT NOT NULL CHECK (tone IN ('gentle', 'reminder', 'firm')),
      channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
      message_preview TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_payment_reminder_log_milestone"
    ON payment_reminder_log(milestone_id, sent_at DESC)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS milestone_preauth (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      milestone_id UUID NOT NULL UNIQUE REFERENCES milestones(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'released')),
      payment_method TEXT CHECK (payment_method IN ('card', 'ach')),
      client_last4 TEXT,
      amount INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    ALTER TABLE subcontractor_bills ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subcontractors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      trade TEXT NOT NULL,
      portal_token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sub_invoice_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
      linked_stage TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid')),
      bill_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}
