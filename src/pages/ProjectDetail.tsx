import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CashFlowRunwayVisualizer from '../components/cashflow/CashFlowRunwayVisualizer'
import CashFlowEditor from '../components/cashflow/CashFlowEditor'
import { getProjectCashflow, type ProjectCashflow } from '../lib/api'
import { toVisualizerData } from '../lib/projectCashFlow'

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const [cashflow, setCashflow] = useState<ProjectCashflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const data = await getProjectCashflow(projectId)
      setCashflow(data)
      setError(null)
    } catch {
      setError('Project not found')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
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

  if (error || !cashflow) {
    return (
      <AppLayout>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">{error ?? 'Project not found'}</p>
          <Link
            to="/dashboard"
            className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            ← Back to projects
          </Link>
        </div>
      </AppLayout>
    )
  }

  const visualizerData = toVisualizerData(cashflow)
  const hasData =
    cashflow.milestones.length > 0 || cashflow.bills.length > 0

  return (
    <AppLayout>
      <div className="space-y-8">
        {hasData ? (
          <CashFlowRunwayVisualizer
            project={visualizerData}
            projectInfo={cashflow.project}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Active Project
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
              {cashflow.project.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {cashflow.project.address
                ? `${cashflow.project.clientName} — ${cashflow.project.address}`
                : cashflow.project.clientName}
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Add milestones and subcontractor bills below to activate your cash
              flow visualizer.
            </p>
          </div>
        )}

        <CashFlowEditor
          projectId={projectId!}
          data={cashflow}
          onUpdate={load}
        />
      </div>
    </AppLayout>
  )
}
