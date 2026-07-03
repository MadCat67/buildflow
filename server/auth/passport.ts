import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'

export type SessionUser = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

passport.serializeUser((user, done) => {
  done(null, (user as SessionUser).id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    done(null, user ?? false)
  } catch (error) {
    done(error, false)
  }
})

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id
        const email = profile.emails?.[0]?.value
        const name = profile.displayName ?? null
        const avatarUrl = profile.photos?.[0]?.value ?? null

        if (!email) {
          return done(new Error('No email returned from Google'), false)
        }

        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.googleId, googleId))
          .limit(1)

        if (existing) {
          const [updated] = await db
            .update(users)
            .set({ name, avatarUrl, updatedAt: new Date() })
            .where(eq(users.id, existing.id))
            .returning({
              id: users.id,
              email: users.email,
              name: users.name,
              avatarUrl: users.avatarUrl,
            })

          return done(null, updated)
        }

        const [created] = await db
          .insert(users)
          .values({ googleId, email, name, avatarUrl })
          .returning({
            id: users.id,
            email: users.email,
            name: users.name,
            avatarUrl: users.avatarUrl,
          })

        done(null, created)
      } catch (error) {
        done(error as Error, false)
      }
    },
  ),
)

export default passport
