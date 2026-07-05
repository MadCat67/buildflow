import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  createDemoProject,
  createProject,
  getProjects,
  type Project,
} from '../lib/api'
import { formatCurrency } from './cashflow/utils'

export function notifyCashflowUpdated() {
  window.dispatchEvent(new Event('cashflow-updated'))
}

type NavSection =
  | 'projects'
  | 'company'
  | 'reminders'
  | 'subs'
  | 'messages'
  | 'calendar'
  | 'membership'
  | 'settings'

const NAV_ITEMS: {
  section: NavSection
  path: string
  label: string
  icon: NavSection
}[] = [
  { section: 'projects', path: '/dashboard', label: 'Projects', icon: 'projects' },
  { section: 'company', path: '/dashboard/company', label: 'Company Totals', icon: 'company' },
  { section: 'reminders', path: '/dashboard/reminders', label: 'Reminders', icon: 'reminders' },
  { section: 'subs', path: '/dashboard/subs', label: 'Sub Portal', icon: 'subs' },
  { section: 'messages', path: '/dashboard/messages', label: 'Auto Messages', icon: 'messages' },
  { section: 'calendar', path: '/dashboard/calendar', label: 'Calendar', icon: 'calendar' },
  { section: 'membership', path: '/dashboard/membership', label: 'Membership', icon: 'membership' },
  { section: 'settings', path: '/dashboard/settings', label: 'Settings', icon: 'settings' },
]

function getActiveSection(pathname: string): NavSection {
  if (pathname.startsWith('/projects/')) return 'projects'
  if (pathname.startsWith('/dashboard/company')) return 'company'
  if (pathname.startsWith('/dashboard/reminders')) return 'reminders'
  if (pathname.startsWith('/dashboard/subs')) return 'subs'
  if (pathname.startsWith('/dashboard/messages')) return 'messages'
  if (pathname.startsWith('/dashboard/calendar')) return 'calendar'
  if (pathname.startsWith('/dashboard/membership')) return 'membership'
  if (pathname.startsWith('/dashboard/settings')) return 'settings'
  return 'projects'
}

export default function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeSection = getActiveSection(location.pathname)
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeLabel =
    NAV_ITEMS.find((item) => item.section === activeSection)?.label ?? 'Menu'

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex w-full items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden"
      >
        <span className="text-sm font-semibold text-slate-900">{activeLabel}</span>
        <svg
          className={`h-5 w-5 text-slate-500 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <aside
        className={`w-full shrink-0 border-r border-slate-200 bg-white lg:block lg:w-64 ${mobileOpen ? 'block' : 'hidden'}`}
      >
        <nav className="flex max-h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.section}
              active={activeSection === item.section}
              onClick={() => navigate(item.path)}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>

        {activeSection === 'projects' && (
          <div className="border-t border-slate-100 px-3 pb-4">
            <ProjectsList />
          </div>
        )}
      </aside>
    </>
  )
}

function NavItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: NavSection
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <NavIcon section={icon} />
      {label}
    </button>
  )
}

function NavIcon({ section }: { section: NavSection }) {
  const className = 'h-5 w-5 shrink-0'

  switch (section) {
    case 'projects':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      )
    case 'company':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      )
    case 'reminders':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      )
    case 'subs':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      )
    case 'membership':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 12h19.5m-16.5 5.25h16.5M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      )
    case 'messages':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      )
    case 'calendar':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    case 'settings':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
  }
}

function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  const load = useCallback(async () => {
    try {
      const { projects: list } = await getProjects()
      setProjects(list)
      setError(null)
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('cashflow-updated', handler)
    return () => window.removeEventListener('cashflow-updated', handler)
  }, [load])

  async function handleCreate(input: {
    name: string
    clientName: string
    address: string
    clientEmail: string
    clientPhone: string
    contractValue: string
  }) {
    const { project } = await createProject({
      name: input.name,
      clientName: input.clientName,
      address: input.address || undefined,
      clientEmail: input.clientEmail || undefined,
      clientPhone: input.clientPhone || undefined,
      contractValue: Number(input.contractValue),
    })
    setProjects((prev) => [project, ...prev])
    setShowForm(false)
    notifyCashflowUpdated()
  }

  return (
    <div className="mt-3 space-y-2">
      <button
        onClick={() => setShowForm(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-400"
      >
        <span className="text-base leading-none">+</span>
        New Project
      </button>

      {error && (
        <p className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">No projects yet</p>
          <button
            onClick={async () => {
              try {
                const { project } = await createDemoProject()
                setProjects((prev) => [project, ...prev])
                notifyCashflowUpdated()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed')
              }
            }}
            className="mt-2 text-xs font-semibold text-brand-600"
          >
            Add sample project
          </button>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-20rem)] space-y-1.5 overflow-y-auto">
          {projects.map((project) => {
            const active = location.pathname === `/projects/${project.id}`
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={`block rounded-lg border px-2.5 py-2 transition-all ${
                  active
                    ? 'border-brand-300 bg-brand-50'
                    : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className="truncate text-xs font-semibold text-slate-900">
                  {project.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {project.clientName}
                </p>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-700">
                    {formatCurrency(project.contractValue)}
                  </span>
                  {project.hasOverdue && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                      Overdue
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showForm && (
        <CreateProjectModal
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

function CreateProjectModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (input: {
    name: string
    clientName: string
    address: string
    clientEmail: string
    clientPhone: string
    contractValue: string
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [address, setAddress] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [contractValue, setContractValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name,
        clientName,
        address,
        clientEmail,
        clientPhone,
        contractValue,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">New Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <Field label="Project name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          </Field>
          <Field label="Client name" required>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} required className={inputClass} />
          </Field>
          <Field label="Client email">
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Client phone">
            <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Property address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Contract value ($)" required>
            <input type="number" min="1" value={contractValue} onChange={(e) => setContractValue(e.target.value)} required className={inputClass} />
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  )
}