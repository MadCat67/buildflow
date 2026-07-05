import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSubPortal, submitSubInvoice } from '../lib/api'
import { formatCurrency } from '../components/cashflow/utils'

export default function SubPortalPublicPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<Awaited<ReturnType<typeof getSubPortal>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkedStage, setLinkedStage] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!token) return
    getSubPortal(token)
      .then((result) => {
        setData(result)
        if (result.milestones[0]) {
          setLinkedStage(result.milestones[0].stageName)
          setMilestoneId(result.milestones[0].id)
        }
      })
      .catch(() => setError('Portal link not found'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    try {
      await submitSubInvoice(token, {
        linkedStage,
        milestoneId: milestoneId || undefined,
        amount: Number(amount),
        description: description || undefined,
      })
      setSubmitted(true)
      const refreshed = await getSubPortal(token)
      setData(refreshed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="text-red-600">{error ?? 'Portal not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-lg space-y-6 px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            BuildFlow Sub Portal
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
            {data.subcontractor.trade}
          </h1>
          <p className="text-sm text-slate-500">
            {data.project.name} · {data.subcontractor.name}
          </p>
        </div>

        {submitted && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Invoice submitted — waiting for GC approval. Payment releases when the
            linked client milestone is paid (pay-when-paid).
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-display text-lg font-bold text-slate-900">
            Submit invoice
          </h2>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Linked client milestone</span>
            <select
              value={milestoneId}
              onChange={(e) => {
                setMilestoneId(e.target.value)
                const m = data.milestones.find((x) => x.id === e.target.value)
                if (m) setLinkedStage(m.stageName)
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              required
            >
              {data.milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.stageName} ({m.status}) — {formatCurrency(m.amount)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Amount ($)</span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Work completed, materials, etc."
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-400"
          >
            Submit for review
          </button>
        </form>

        {data.submissions.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-bold text-slate-900">
              Your submissions
            </h2>
            <div className="mt-3 space-y-2">
              {data.submissions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-800">
                    {s.linkedStage} · {formatCurrency(s.amount)}
                  </span>
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
