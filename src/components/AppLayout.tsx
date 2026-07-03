import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppSidebar from './AppSidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex h-16 max-w-[90rem] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <span className="font-display text-xl font-bold text-slate-900">
              BuildFlow
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/dashboard"
              className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 sm:block"
            >
              All Projects
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name ?? 'User'}
                  className="h-8 w-8 rounded-full ring-2 ring-brand-200"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {user?.name?.charAt(0) ?? user?.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {user?.name ?? 'User'}
                </p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </nav>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[90rem] flex-col lg:flex-row">
        <AppSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
