import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
]

export default function Navbar() {
  const { user, loading } = useAuth()

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
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
          <span className="font-display text-xl font-bold text-white">
            BuildFlow
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white sm:block"
              >
                Dashboard
              </Link>
              {user.avatarUrl ? (
                <Link to="/dashboard">
                  <img
                    src={user.avatarUrl}
                    alt={user.name ?? 'User'}
                    className="h-8 w-8 rounded-full ring-2 ring-brand-500/50"
                  />
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-300"
                >
                  {user.name?.charAt(0) ?? user.email.charAt(0).toUpperCase()}
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white sm:block"
              >
                Log in
              </Link>
              <Link
                to="/login"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-500/40"
              >
                Start free trial
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
