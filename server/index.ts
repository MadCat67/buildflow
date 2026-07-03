import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import cors from 'cors'
import passport from './auth/passport.js'
import authRoutes from './auth/routes.js'
import projectRoutes from './routes/projects.js'
import financeRoutes from './routes/finances.js'
import calendarRoutes from './routes/calendar.js'
import { migrate } from './db/migrate.js'
import { pool } from './db/index.js'

const PgSession = connectPgSimple(session)
const PORT = Number(process.env.PORT) || 3001
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

async function start() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it in your .env file.')
    process.exit(1)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.')
    process.exit(1)
  }

  const placeholders = ['your-google-client-id', 'your-google-client-secret']
  if (placeholders.includes(clientId) || placeholders.includes(clientSecret)) {
    console.error(
      'Google OAuth credentials are still placeholders in .env.\n' +
        'Create credentials at https://console.cloud.google.com/apis/credentials\n' +
        'and set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to the real values.',
    )
    process.exit(1)
  }

  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    console.error(
      'GOOGLE_CLIENT_ID does not look valid (expected to end with .apps.googleusercontent.com).',
    )
    process.exit(1)
  }

  if (!clientSecret.startsWith('GOCSPX-')) {
    console.error(
      'GOOGLE_CLIENT_SECRET does not look valid (expected to start with GOCSPX-).',
    )
    process.exit(1)
  }

  if (!process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET is required.')
    process.exit(1)
  }

  await migrate()

  const app = express()

  app.use(express.json())

  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true,
    }),
  )

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      },
    }),
  )

  app.use(passport.initialize())
  app.use(passport.session())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/projects', projectRoutes)
  app.use('/api/finances', financeRoutes)
  app.use('/api/calendar', calendarRoutes)

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    },
  )

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(
      `Google OAuth callback (add this in Google Cloud Console): ${process.env.SERVER_URL}/api/auth/google/callback`,
    )
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
