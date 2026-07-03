import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
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

      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-slate-600">
            Welcome to BuildFlow. Your workspace is ready — project management
            features coming soon.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Projects"
            description="Track active jobs, milestones, and completion progress."
            status="Coming soon"
          />
          <DashboardCard
            title="Team Schedule"
            description="Assign crews, view availability, and manage job sites."
            status="Coming soon"
          />
          <DashboardCard
            title="Finances"
            description="Invoices, expenses, and profit tracking per project."
            status="Coming soon"
          />
          <DashboardCard
            title="Estimates"
            description="Create and send professional project estimates."
            status="Coming soon"
          />
          <DashboardCard
            title="Communications"
            description="Automated calls, emails, and contractor messaging."
            status="Coming soon"
          />
          <DashboardCard
            title="Contractors"
            description="Manage your subcontractor network and coordination."
            status="Coming soon"
          />
        </div>
      </main>
    </div>
  )
}

function DashboardCard({
  title,
  description,
  status,
}: {
  title: string
  description: string
  status: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-slate-900">
          {title}
        </h3>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
          {status}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  )
}
