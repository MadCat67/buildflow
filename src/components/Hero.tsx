export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 pb-24 pt-32 lg:pb-32 lg:pt-40">
      <div className="hero-glow absolute inset-0" />
      <div className="grid-pattern absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Built for contractors & renovators
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Run your construction business{' '}
            <span className="text-gradient">from one place</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            BuildFlow automates calls and emails, tracks your crew, manages
            finances, and keeps every project on schedule — so you can focus on
            building, not paperwork.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#cta"
              className="w-full rounded-xl bg-brand-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-brand-500/30 transition-all hover:bg-brand-400 hover:shadow-brand-500/50 sm:w-auto"
            >
              Get started free
            </a>
            <a
              href="#features"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-8 py-3.5 text-base font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800/50 sm:w-auto"
            >
              <svg
                className="h-5 w-5 text-brand-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              See how it works
            </a>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl lg:mt-20">
          <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-brand-500/20 via-transparent to-brand-500/20 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="mx-auto flex-1 text-center text-xs text-slate-500">
                app.buildflow.io/dashboard
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
              <DashboardCard
                title="Active Projects"
                value="12"
                change="+3 this month"
                accent="brand"
              />
              <DashboardCard
                title="Revenue (MTD)"
                value="$284K"
                change="↑ 18% vs last month"
                accent="green"
              />
              <DashboardCard
                title="On Schedule"
                value="94%"
                change="8 of 12 projects"
                accent="blue"
              />
            </div>

            <div className="grid gap-4 border-t border-slate-800 p-4 sm:grid-cols-2 sm:p-6">
              <ProjectProgress />
              <TeamSchedule />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DashboardCard({
  title,
  value,
  change,
  accent,
}: {
  title: string
  value: string
  change: string
  accent: 'brand' | 'green' | 'blue'
}) {
  const accentColors = {
    brand: 'text-brand-400',
    green: 'text-emerald-400',
    blue: 'text-sky-400',
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-850 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      <p className={`mt-1 text-xs ${accentColors[accent]}`}>{change}</p>
    </div>
  )
}

function ProjectProgress() {
  const projects = [
    { name: 'Kitchen Remodel — Oak St.', progress: 78, status: 'On track' },
    { name: 'Bathroom Renovation — Elm Ave.', progress: 45, status: 'In progress' },
    { name: 'Deck Build — Maple Dr.', progress: 92, status: 'Finishing' },
  ]

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-850 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Project Progress</h3>
        <span className="text-xs text-slate-500">This week</span>
      </div>
      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.name}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-300">{project.name}</span>
              <span className="text-slate-500">{project.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamSchedule() {
  const crew = [
    { name: 'Mike T.', role: 'Lead Carpenter', status: 'On site' },
    { name: 'Sarah L.', role: 'Electrician', status: 'Scheduled' },
    { name: 'James R.', role: 'Plumber', status: 'Available' },
  ]

  const statusColors: Record<string, string> = {
    'On site': 'bg-emerald-500/20 text-emerald-400',
    Scheduled: 'bg-brand-500/20 text-brand-400',
    Available: 'bg-slate-700 text-slate-400',
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-850 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Team Schedule</h3>
        <span className="text-xs text-slate-500">Today</span>
      </div>
      <div className="space-y-3">
        {crew.map((member) => (
          <div
            key={member.name}
            className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-slate-200">{member.name}</p>
              <p className="text-xs text-slate-500">{member.role}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[member.status]}`}
            >
              {member.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
