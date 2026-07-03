import type { SessionUser } from './auth/passport.js'

declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

export {}
