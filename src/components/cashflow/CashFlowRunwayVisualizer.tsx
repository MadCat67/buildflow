import { useMemo, useState } from 'react'
import { kitchenRenovationProject } from './mockData'
import type { ClientMilestone, MilestoneStatus, SubBillStatus, SubcontractorBill } from './types'
import {
  computeMetrics,
  daysUntil,
  formatCurrency,
  formatDueDate,
  isBillOverdue,
  isMilestoneOverdue,
} from './utils'
import RequestPaymentModal from './RequestPaymentModal'
import type { Project } from '../../lib/api'

type CashFlowRunwayVisualizerProps = {
  project?: typeof kitchenRenovationProject
  projectInfo?: Project
}

export default function CashFlowRunwayVisualizer({
  project = kitchenRenovationProject,
  projectInfo,
}: CashFlowRunwayVisualizerProps) {
  const referenceDate = new Date()
  const metrics = useMemo(() => computeMetrics(project), [project])
  const [paymentTarget, setPaymentTarget] = useState<ClientMilestone | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)

  const maxPipeline = Math.max(
    metrics.fundsCollected,
    metrics.totalSubOwed,
    project.projectValue * 0.4,
  )

  const collectedPct = (metrics.fundsCollected / maxPipeline) * 100
  const owedPct = (metrics.totalSubOwed / maxPipeline) * 100

  return (
    <div className="space-y-6">
      {paymentMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {paymentMessage}
        </div>
      )}
      <ProjectHeader project={project} metrics={metrics} />

      <section className="grid gap-4 sm:grid-cols-3">
        <KPICard
          label="Net Project Runway"
          value={formatCurrency(metrics.netRunway)}
          sublabel="Collected + guaranteed − sub owed"
          variant={metrics.netRunway < 0 ? 'danger' : 'success'}
        />
        <KPICard
          label="Awaiting Client Approval"
          value={formatCurrency(metrics.awaitingClientApproval)}
          sublabel="Invoiced, not yet paid"
          variant="warning"
        />
        <KPICard
          label="Next 14-Day Outflow"
          value={formatCurrency(metrics.next14DayOutflow)}
          sublabel="Sub invoices due soon"
          variant="danger"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Cash Pipeline Runway
            </h2>
            <p className="text-sm text-slate-500">
              Client inflows vs. subcontractor commitments
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <LegendDot color="bg-emerald-500" label="Cash collected" />
            <LegendDot color="bg-red-500" label="Sub owed" />
          </div>
        </div>

        <div className="space-y-5">
          <RunwayBar
            label="Cash collected from client"
            amount={metrics.fundsCollected}
            percent={collectedPct}
            colorClass="bg-emerald-500"
            trackClass="bg-emerald-50"
          />
          <RunwayBar
            label="Committed to subcontractors"
            amount={metrics.totalSubOwed}
            percent={owedPct}
            colorClass="bg-red-500"
            trackClass="bg-red-50"
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <PipelineStat
            label="Client funds in hand"
            value={formatCurrency(metrics.fundsCollected)}
            color="text-emerald-700"
          />
          <PipelineStat
            label="Outstanding sub liability"
            value={formatCurrency(metrics.totalSubOwed)}
            color="text-red-700"
          />
        </div>

        {metrics.isCashCrunch && (
          <div
            role="alert"
            className="mt-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 sm:p-5"
          >
            <p className="font-display text-base font-bold text-red-800 sm:text-lg">
              ⚠️ CASH CRUNCH WARNING
            </p>
            <p className="mt-2 text-sm leading-relaxed text-red-700">
              You are fronting{' '}
              <span className="font-bold">
                {formatCurrency(metrics.cashFronting)}
              </span>{' '}
              of your own money for this phase. Pause subcontractor work or
              request a client milestone release.
            </p>
          </div>
        )}
      </section>

      {project.phaseRunway && project.phaseRunway.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Pay-When-Paid Phase Runway
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Client cash incoming vs. sub bills owed per milestone — spot a crunch
            14 days before it hits.
          </p>
          <div className="mt-4 space-y-3">
            {project.phaseRunway
              .filter((p) => p.linkedBillCount > 0 || p.subOwed > 0)
              .map((phase) => (
                <div
                  key={phase.milestoneId}
                  className={`rounded-xl border p-4 ${
                    phase.isCrunch
                      ? 'border-red-200 bg-red-50/50'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{phase.stageName}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        Client milestone: {phase.milestoneStatus}
                      </p>
                    </div>
                    {phase.isCrunch && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                        Cash crunch
                      </span>
                    )}
                    {phase.crunchIn14Days && !phase.isCrunch && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        Due in 14 days
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                    <div>
                      <p className="text-slate-500">Client incoming</p>
                      <p className="font-bold text-emerald-700">
                        {formatCurrency(phase.clientIncoming)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Sub owed</p>
                      <p className="font-bold text-red-700">
                        {formatCurrency(phase.subOwed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Gap</p>
                      <p
                        className={`font-bold ${phase.gap < 0 ? 'text-red-700' : 'text-emerald-700'}`}
                      >
                        {formatCurrency(phase.gap)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <PipelineTable
          title="Client Inflows"
          subtitle="Milestone payment pipeline"
          accent="emerald"
        >
          <div className="divide-y divide-slate-100">
            {project.milestones.map((milestone) => (
              <InflowRow
                key={milestone.id}
                milestone={milestone}
                referenceDate={referenceDate}
                canRequestPayment={!!projectInfo && milestone.status !== 'paid'}
                onRequestPayment={() => setPaymentTarget(milestone)}
              />
            ))}
          </div>
        </PipelineTable>

        <PipelineTable
          title="Subcontractor Outflows"
          subtitle="Bills linked to project stages"
          accent="red"
        >
          <div className="divide-y divide-slate-100">
            {project.subcontractorBills.map((bill) => (
              <OutflowRow
                key={bill.id}
                bill={bill}
                referenceDate={referenceDate}
              />
            ))}
          </div>
        </PipelineTable>
      </section>

      {paymentTarget && projectInfo && (
        <RequestPaymentModal
          project={projectInfo}
          milestoneId={paymentTarget.id}
          stageName={paymentTarget.stageName}
          amount={paymentTarget.amount}
          dueDate={paymentTarget.dueDate}
          onClose={() => setPaymentTarget(null)}
          onSuccess={(msg) => setPaymentMessage(msg)}
        />
      )}
    </div>
  )
}

function ProjectHeader({
  project,
  metrics,
}: {
  project: typeof kitchenRenovationProject
  metrics: ReturnType<typeof computeMetrics>
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Active Project
          </p>
          <h1 className="mt-1 font-display text-xl font-bold text-slate-900 sm:text-2xl">
            {project.projectName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{project.clientName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Contract: {formatCurrency(project.projectValue)}
          </span>
          {metrics.isCashCrunch && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              Cash Squeeze Active
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({
  label,
  value,
  sublabel,
  variant,
}: {
  label: string
  value: string
  sublabel: string
  variant: 'success' | 'warning' | 'danger'
}) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50',
  }
  const valueStyles = {
    success: 'text-emerald-800',
    warning: 'text-amber-800',
    danger: 'text-red-800',
  }

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${styles[variant]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-2xl font-bold sm:text-3xl ${valueStyles[variant]}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
    </div>
  )
}

function RunwayBar({
  label,
  amount,
  percent,
  colorClass,
  trackClass,
}: {
  label: string
  amount: number
  percent: number
  colorClass: string
  trackClass: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">
          {formatCurrency(amount)}
        </span>
      </div>
      <div className={`h-8 overflow-hidden rounded-lg ${trackClass} sm:h-10`}>
        <div
          className={`flex h-full items-center justify-end rounded-lg px-3 transition-all duration-700 ${colorClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        >
          {percent > 18 && (
            <span className="text-xs font-bold text-white">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function PipelineStat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function PipelineTable({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string
  subtitle: string
  accent: 'emerald' | 'red'
  children: React.ReactNode
}) {
  const borderColor = accent === 'emerald' ? 'border-emerald-200' : 'border-red-200'
  const titleColor = accent === 'emerald' ? 'text-emerald-800' : 'text-red-800'

  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${borderColor}`}>
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h3 className={`font-display text-base font-bold ${titleColor}`}>
          {title}
        </h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function InflowRow({
  milestone,
  referenceDate,
  canRequestPayment,
  onRequestPayment,
}: {
  milestone: ClientMilestone
  referenceDate: Date
  canRequestPayment: boolean
  onRequestPayment: () => void
}) {
  const overdue =
    milestone.dueDate &&
    isMilestoneOverdue(milestone.status, milestone.dueDate, referenceDate)
  const days = milestone.dueDate
    ? daysUntil(milestone.dueDate, referenceDate)
    : null
  const dueLabel =
    days === null
      ? null
      : days < 0
        ? `${Math.abs(days)}d overdue`
        : days === 0
          ? 'Due today'
          : `Due in ${days}d`

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{milestone.stageName}</p>
        <p className="text-sm font-bold text-slate-800">
          {formatCurrency(milestone.amount)}
        </p>
        {milestone.dueDate && (
          <p
            className={`mt-1 text-xs font-medium ${overdue ? 'text-red-600' : 'text-slate-500'}`}
          >
            Due {formatDueDate(milestone.dueDate)}
            {dueLabel && ` · ${dueLabel}`}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={milestone.status} type="milestone" />
        {overdue && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
            Overdue
          </span>
        )}
        {canRequestPayment && (
          <button
            onClick={onRequestPayment}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Request Payment
          </button>
        )}
      </div>
    </div>
  )
}

function OutflowRow({
  bill,
  referenceDate,
}: {
  bill: SubcontractorBill
  referenceDate: Date
}) {
  const days = daysUntil(bill.dueDate, referenceDate)
  const dueLabel =
    days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
        ? 'Due today'
        : `Due in ${days}d`

  const isUrgent =
    bill.status === 'unpaid' &&
    (isBillOverdue(bill.status, bill.dueDate, referenceDate) || days <= 7)

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{bill.trade}</p>
        <p className="text-xs text-slate-500">{bill.linkedStage}</p>
        <p className="text-sm font-bold text-slate-800">
          {formatCurrency(bill.amount)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-slate-500'}`}
        >
          {formatDueDate(bill.dueDate)} · {dueLabel}
        </span>
        {bill.status === 'unpaid' &&
          isBillOverdue(bill.status, bill.dueDate, referenceDate) && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
              Overdue
            </span>
          )}
        {bill.payWhenPaidStatus === 'held' && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
            Pay when paid
          </span>
        )}
        {bill.payWhenPaidStatus === 'payable' && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
            Ready to pay
          </span>
        )}
        <StatusBadge status={bill.status} type="bill" />
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  type,
}: {
  status: MilestoneStatus | SubBillStatus
  type: 'milestone' | 'bill'
}) {
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' },
    invoiced: { label: 'Invoiced', className: 'bg-amber-100 text-amber-800' },
    pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
    unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-800' },
  }

  const { label, className } = config[status]

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {type === 'bill' && status === 'paid' ? 'Paid' : label}
    </span>
  )
}
