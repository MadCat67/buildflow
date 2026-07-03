import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import cors from 'cors'
import passport from './auth/passport.js'
import authRoutes from './auth/routes.js'
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

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.')
    process.exit(1)
  }

  if (!process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET is required.')
    process.exit(1)
  }

  await migrate()

  const app = express()

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

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
