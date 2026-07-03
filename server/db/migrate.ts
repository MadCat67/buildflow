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
}
