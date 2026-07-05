import { useCallback, useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import {
  approveSubSubmission,
  getProjects,
  getSubcontractors,
  inviteSubcontractor,
  rejectSubSubmission,
  type Project,
  type SubInvoiceSubmission,
  type SubcontractorRecord,
} from '../lib/api'
import { formatCurrency } from '../components/cashflow/utils'

export default function SubPortalPage() {
  const [subs, setSubs] = useState<SubcontractorRecord[]>([])
  const [submissions, setSubmissions] = useState<SubInvoiceSubmission[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [{ subcontractors, submissions: subs_ }, { projects: list }] =
        await Promise.all([getSubcontractors(), getProjects()])
      setSubs(subcontractors)
      setSubmissions(subs_)
      setProjects(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function handleApprove(id: string) {
    await approveSubSubmission(id)
    showToast('Invoice approved — added to cash flow as pay-when-paid bill')
    load()
  }

  async function handleReject(id: string) {
    await rejectSubSubmission(id)
    showToast('Submission rejected')
    load()
  }

  function copyPortalUrl(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const pending = submissions.filter((s) => s.status === 'pending_review')

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Subcontractor Portal
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Pay-when-paid workflow — subs upload invoices linked to client
              milestones. See cash crunch per phase before it hits.
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
          >
            Invite subcontractor
          </button>
        </div>

        {toast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {toast}
          </div>
        )}

        {pending.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Pending invoices ({pending.length})
            </h2>
            <div className="mt-4 space-y-3">
              {pending.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-white bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(sub.amount)} · {sub.linkedStage}
                      </p>
                      <p className="text-sm text-slate-500">{sub.projectName}</p>
                      {sub.description && (
                        <p className="mt-1 text-sm text-slate-600">{sub.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(sub.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(sub.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Invited subcontractors
          </h2>
          {subs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No subs invited yet. Send a portal link so they can upload invoices
              tied to project milestones.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {subs.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {sub.name} · {sub.trade}
                    </p>
                    <p className="text-sm text-slate-500">
                      {sub.projectName} · {sub.email}
                    </p>
                  </div>
                  <button
                    onClick={() => copyPortalUrl(sub.portalUrl, sub.id)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                  >
                    {copiedId === sub.id ? 'Copied!' : 'Copy portal link'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            How pay-when-paid works
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Sub uploads invoice in their portal, linked to a client milestone.</li>
            <li>Bill stays <strong>held</strong> until the client pays that milestone.</li>
            <li>Cash runway visualizer shows incoming vs. owed per phase — crunch warnings 14 days out.</li>
            <li>When client pays, sub bill becomes <strong>payable</strong> — ready to release.</li>
          </ol>
        </section>
      </div>

      {showInvite && (
        <InviteSubModal
          projects={projects}
          onClose={() => setShowInvite(false)}
          onSuccess={(url) => {
            setShowInvite(false)
            showToast('Portal link copied to clipboard')
            navigator.clipboard.writeText(url)
            load()
          }}
        />
      )}
    </AppLayout>
  )
}

function InviteSubModal({
  projects,
  onClose,
  onSuccess,
}: {
  projects: Project[]
  onClose: () => void
  onSuccess: (portalUrl: string) => void
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [trade, setTrade] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { subcontractor } = await inviteSubcontractor({
        projectId,
        name,
        email,
        phone: phone || undefined,
        trade,
      })
      onSuccess(subcontractor.portalUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-display text-lg font-bold">Invite subcontractor</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Trade</span>
            <input
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              placeholder="e.g. Plumbing"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Phone (optional)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create portal link'}
          </button>
        </form>
      </div>
    </div>
  )
}
