import { useState } from 'react'
import { requestPayment, type Project } from '../../lib/api'
import { formatCurrency } from './utils'

type RequestPaymentModalProps = {
  project: Project
  milestoneId: string
  stageName: string
  amount: number
  dueDate?: string | null
  onClose: () => void
  onSuccess: (message: string) => void
}

export default function RequestPaymentModal({
  project,
  milestoneId,
  stageName,
  amount,
  dueDate,
  onClose,
  onSuccess,
}: RequestPaymentModalProps) {
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    if (!email && !sms) {
      setError('Select at least one channel')
      return
    }

    const channels: ('email' | 'sms')[] = []
    if (email) channels.push('email')
    if (sms) channels.push('sms')

    setSubmitting(true)
    setError(null)

    try {
      const result = await requestPayment(project.id, milestoneId, channels)
      const parts = []
      if (result.emailSent) parts.push('email')
      if (result.smsSent) parts.push('text')
      const warning =
        result.warnings.length > 0 ? ` (${result.warnings.join('; ')})` : ''
      onSuccess(`Payment request sent via ${parts.join(' & ')}${warning}`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b px-5 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Request Payment
          </h2>
          <p className="mt-1 text-sm text-slate-600">{stageName}</p>
          <p className="text-sm font-bold text-slate-900">
            {formatCurrency(amount)}
            {dueDate && (
              <span className="ml-2 font-normal text-slate-500">
                due {dueDate}
              </span>
            )}
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-800">Client:</span>{' '}
              {project.clientName}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-800">Email:</span>{' '}
              {project.clientEmail || (
                <span className="text-amber-600">Not set — add in project settings</span>
              )}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-800">Phone:</span>{' '}
              {project.clientPhone || (
                <span className="text-amber-600">Not set — add in project settings</span>
              )}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-700">Send via:</p>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={email}
              onChange={(e) => setEmail(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Email</p>
              <p className="text-xs text-slate-500">Automated payment reminder email</p>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={sms}
              onChange={(e) => setSms(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Text message</p>
              <p className="text-xs text-slate-500">SMS payment reminder</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 border-t px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={submitting}
            className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
