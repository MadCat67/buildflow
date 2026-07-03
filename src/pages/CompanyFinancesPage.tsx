import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { getCompanyFinances, type CompanyFinances } from '../lib/api'
import { formatCurrency } from '../components/cashflow/utils'

export default function CompanyFinancesPage() {
  const [finances, setFinances] = useState<CompanyFinances | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setFinances(await getCompanyFinances())
    } catch {
      setFinances(null)
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  const totals = finances?.totals

  if (!totals) {
    return (
      <AppLayout>
        <p className="text-slate-600">Unable to load company finances.</p>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Company Finances
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Totals across all active projects — no need to tally each job manually.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Net Company Runway"
            value={formatCurrency(totals.netRunway)}
            variant={totals.netRunway < 0 ? 'danger' : 'success'}
            sub="Collected minus sub bills owed"
          />
          <MetricCard
            label="Cash Collected"
            value={formatCurrency(totals.fundsCollected)}
            variant="success"
            sub="Paid client milestones"
          />
          <MetricCard
            label="Awaiting Clients"
            value={formatCurrency(totals.awaitingClientApproval)}
            variant="warning"
            sub="Invoiced, not yet paid"
          />
          <MetricCard
            label="Sub Bills Owed"
            value={formatCurrency(totals.totalSubOwed)}
            variant="danger"
            sub="Unpaid subcontractor bills"
          />
          <MetricCard
            label="Due in 14 Days"
            value={formatCurrency(totals.next14DayOutflow)}
            variant="danger"
            sub="Upcoming sub outflows"
          />
          <MetricCard
            label="Active Projects"
            value={String(totals.activeProjects)}
            variant="neutral"
            sub={`${totals.projectsWithData} with cash flow data`}
          />
        </section>

        {totals.cashFronting > 0 && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
            <p className="font-display text-lg font-bold text-red-800">
              Fronting {formatCurrency(totals.cashFronting)} company-wide
            </p>
            <p className="mt-1 text-sm text-red-700">
              {totals.projectsInCrunch} project
              {totals.projectsInCrunch !== 1 ? 's are' : ' is'} in a cash crunch.
              Review individual projects to request client payments or pause sub work.
            </p>
          </div>
        )}

        {finances.projects.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-lg font-bold text-slate-900">
              Breakdown by Project
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {finances.projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    {p.isCashCrunch && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                        Crunch
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Runway</p>
                      <p className={`font-bold ${p.netRunway < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(p.netRunway)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Collected</p>
                      <p className="font-bold text-slate-800">
                        {formatCurrency(p.fundsCollected)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Awaiting</p>
                      <p className="font-bold text-amber-700">
                        {formatCurrency(p.awaitingClientApproval)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Sub owed</p>
                      <p className="font-bold text-red-700">
                        {formatCurrency(p.totalSubOwed)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}

function MetricCard({
  label,
  value,
  variant,
  sub,
}: {
  label: string
  value: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
  sub: string
}) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50',
    neutral: 'border-slate-200 bg-white',
  }
  const valueStyles = {
    success: 'text-emerald-800',
    warning: 'text-amber-800',
    danger: 'text-red-800',
    neutral: 'text-slate-900',
  }

  return (
    <div className={`rounded-2xl border p-5 ${styles[variant]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-2 font-display text-2xl font-bold ${valueStyles[variant]}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  )
}
