import 'express-session'

declare module 'express-session' {
  interface SessionData {
    calendarOAuthState?: string
    calendarOAuthUserId?: string
    gmailOAuthState?: string
    gmailOAuthUserId?: string
  }
}
