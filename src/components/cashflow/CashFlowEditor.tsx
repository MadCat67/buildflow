import { useState } from 'react'
import {
  createBill,
  createMilestone,
  deleteBill,
  deleteMilestone,
  updateBill,
  updateMilestone,
  updateProject,
  type Milestone,
  type ProjectCashflow,
  type SubcontractorBill,
} from '../../lib/api'
import { notifyCashflowUpdated } from '../AppSidebar'
import { formatCurrency } from './utils'
import type { MilestoneStatus, SubBillStatus } from './types'

type CashFlowEditorProps = {
  projectId: string
  data: ProjectCashflow
  onUpdate: () => void
}

export default function CashFlowEditor({
  projectId,
  data,
  onUpdate,
}: CashFlowEditorProps) {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [showBillForm, setShowBillForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refreshAfterMutation(action: () => Promise<void>) {
    setError(null)
    try {
      await action()
      onUpdate()
      notifyCashflowUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <section className="space-y-6">
      <CustomerContactSection
        projectId={projectId}
        data={data}
        onUpdate={onUpdate}
        setError={setError}
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-display text-lg font-bold text-slate-900">
          Manage Cash Flow Data
        </h2>
        <p className="text-sm text-slate-500">
          Add or edit client milestones and subcontractor bills
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-800">
              Client Milestones
            </h3>
            <button
              onClick={() => setShowMilestoneForm(!showMilestoneForm)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-500"
            >
              {showMilestoneForm ? 'Cancel' : '+ Add Milestone'}
            </button>
          </div>

          {showMilestoneForm && (
            <MilestoneForm
              onSubmit={(input) =>
                refreshAfterMutation(async () => {
                  await createMilestone(projectId, input)
                  setShowMilestoneForm(false)
                })
              }
            />
          )}

          <div className="mt-3 space-y-2">
            {data.milestones.length === 0 ? (
              <p className="text-xs text-slate-500">No milestones yet</p>
            ) : (
              data.milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  onUpdate={(input) =>
                    refreshAfterMutation(async () => {
                      await updateMilestone(projectId, m.id, input)
                    })
                  }
                  onDelete={() =>
                    refreshAfterMutation(async () => {
                      await deleteMilestone(projectId, m.id)
                    })
                  }
                />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-red-800">
              Subcontractor Bills
            </h3>
            <button
              onClick={() => setShowBillForm(!showBillForm)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-500"
            >
              {showBillForm ? 'Cancel' : '+ Add Bill'}
            </button>
          </div>

          {showBillForm && (
            <BillForm
              stageOptions={data.milestones.map((m) => m.stageName)}
              onSubmit={(input) =>
                refreshAfterMutation(async () => {
                  await createBill(projectId, input)
                  setShowBillForm(false)
                })
              }
            />
          )}

          <div className="mt-3 space-y-2">
            {data.bills.length === 0 ? (
              <p className="text-xs text-slate-500">No bills yet</p>
            ) : (
              data.bills.map((b) => (
                <BillRow
                  key={b.id}
                  bill={b}
                  stageOptions={data.milestones.map((m) => m.stageName)}
                  onUpdate={(input) =>
                    refreshAfterMutation(async () => {
                      await updateBill(projectId, b.id, input)
                    })
                  }
                  onDelete={() =>
                    refreshAfterMutation(async () => {
                      await deleteBill(projectId, b.id)
                    })
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </section>
  )
}

function CustomerContactSection({
  projectId,
  data,
  onUpdate,
  setError,
}: {
  projectId: string
  data: ProjectCashflow
  onUpdate: () => void
  setError: (msg: string | null) => void
}) {
  const [clientEmail, setClientEmail] = useState(data.project.clientEmail ?? '')
  const [clientPhone, setClientPhone] = useState(data.project.clientPhone ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateProject(projectId, { clientEmail, clientPhone })
      onUpdate()
      notifyCashflowUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact info')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">
        Customer Contact
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Required for automated payment reminder emails and texts
      </p>
      <form onSubmit={handleSave} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            Client email
          </span>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="client@email.com"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            Client phone
          </span>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="+15551234567"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Contact Info'}
        </button>
      </form>
    </div>
  )
}

function MilestoneForm({
  initial,
  onSubmit,
}: {
  initial?: Milestone
  onSubmit: (input: {
    stageName: string
    amount: number
    status: MilestoneStatus
    completedDate?: string
    dueDate?: string
  }) => void
}) {
  const [stageName, setStageName] = useState(initial?.stageName ?? '')
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  const [status, setStatus] = useState<MilestoneStatus>(initial?.status ?? 'pending')
  const [completedDate, setCompletedDate] = useState(initial?.completedDate ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          stageName,
          amount: Number(amount),
          status,
          completedDate: completedDate || undefined,
          dueDate: dueDate || undefined,
        })
      }}
      className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      <input
        value={stageName}
        onChange={(e) => setStageName(e.target.value)}
        placeholder="Stage name"
        required
        className={inputClass}
      />
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        required
        className={inputClass}
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
        className={inputClass}
      >
        <option value="pending">Pending</option>
        <option value="invoiced">Invoiced</option>
        <option value="paid">Paid</option>
      </select>
      <input
        type="date"
        value={completedDate}
        onChange={(e) => setCompletedDate(e.target.value)}
        className={inputClass}
      />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-700">
          Payment due date
        </span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white hover:bg-brand-400"
      >
        Save Milestone
      </button>
    </form>
  )
}

function BillForm({
  initial,
  stageOptions,
  onSubmit,
}: {
  initial?: SubcontractorBill
  stageOptions: string[]
  onSubmit: (input: {
    trade: string
    amount: number
    dueDate: string
    status: SubBillStatus
    linkedStage: string
  }) => void
}) {
  const [trade, setTrade] = useState(initial?.trade ?? '')
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [status, setStatus] = useState<SubBillStatus>(initial?.status ?? 'unpaid')
  const [linkedStage, setLinkedStage] = useState(
    initial?.linkedStage ?? stageOptions[0] ?? '',
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          trade,
          amount: Number(amount),
          dueDate,
          status,
          linkedStage,
        })
      }}
      className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      <input
        value={trade}
        onChange={(e) => setTrade(e.target.value)}
        placeholder="Trade (e.g. Plumbing)"
        required
        className={inputClass}
      />
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        required
        className={inputClass}
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        required
        className={inputClass}
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as SubBillStatus)}
        className={inputClass}
      >
        <option value="unpaid">Unpaid</option>
        <option value="paid">Paid</option>
      </select>
      <input
        value={linkedStage}
        onChange={(e) => setLinkedStage(e.target.value)}
        placeholder="Linked stage"
        required
        list="stage-options"
        className={inputClass}
      />
      <datalist id="stage-options">
        {stageOptions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button
        type="submit"
        className="w-full rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white hover:bg-brand-400"
      >
        Save Bill
      </button>
    </form>
  )
}

function MilestoneRow({
  milestone,
  onUpdate,
  onDelete,
}: {
  milestone: Milestone
  onUpdate: (input: Partial<{
    stageName: string
    amount: number
    status: MilestoneStatus
    completedDate?: string
    dueDate?: string
  }>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <MilestoneForm
          initial={milestone}
          onSubmit={(input) => {
            onUpdate(input)
            setEditing(false)
          }}
        />
        <button
          onClick={() => setEditing(false)}
          className="mt-2 text-xs text-slate-500"
        >
          Cancel edit
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">
          {milestone.stageName}
        </p>
        <p className="text-xs text-slate-500">
          {formatCurrency(milestone.amount)} · {milestone.status}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
        >
          Del
        </button>
      </div>
    </div>
  )
}

function BillRow({
  bill,
  stageOptions,
  onUpdate,
  onDelete,
}: {
  bill: SubcontractorBill
  stageOptions: string[]
  onUpdate: (input: Partial<{
    trade: string
    amount: number
    dueDate: string
    status: SubBillStatus
    linkedStage: string
  }>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <BillForm
          initial={bill}
          stageOptions={stageOptions}
          onSubmit={(input) => {
            onUpdate(input)
            setEditing(false)
          }}
        />
        <button
          onClick={() => setEditing(false)}
          className="mt-2 text-xs text-slate-500"
        >
          Cancel edit
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{bill.trade}</p>
        <p className="text-xs text-slate-500">
          {formatCurrency(bill.amount)} · {bill.status} · {bill.dueDate}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
        >
          Del
        </button>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
