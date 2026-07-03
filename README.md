# BuildFlow

All-in-one business management for construction and home renovation companies.

## Features

- Modern, responsive marketing landing page
- Google OAuth authentication
- User accounts stored in Neon PostgreSQL
- Protected dashboard (foundation for future features)

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

## Google OAuth setup

**Use a separate OAuth client for BuildFlow.** Do not reuse credentials from another app (e.g. uni-subs.com) — Google will show that app's name on the sign-in screen and redirects may send users to the wrong site.

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a **new** OAuth 2.0 Client ID (Web application), or use a separate Google Cloud project for BuildFlow
3. Configure the **OAuth consent screen** with the BuildFlow app name
4. Add this authorized redirect URI exactly:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
5. Copy the new Client ID and Client Secret into `.env` (not your other project's credentials)

## Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SESSION_SECRET` | Random string for session encryption |
| `CLIENT_URL` | Frontend URL (default: `http://localhost:5173`) |
| `SERVER_URL` | Backend URL (default: `http://localhost:3001`) |

## Getting started

```bash
npm install
npm run dev
```

This starts both the Vite frontend (`http://localhost:5173`) and Express API (`http://localhost:3001`).

## Auth flow

1. User clicks "Continue with Google" on `/login`
2. Server handles OAuth via Passport.js
3. User record is created/updated in Neon
4. Session is stored in PostgreSQL
5. User is redirected to `/dashboard`

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Backend:** Express, Passport.js (Google OAuth), express-session
- **Database:** Neon PostgreSQL with Drizzle ORM

## Build

```bash
npm run build
npm run preview
```
