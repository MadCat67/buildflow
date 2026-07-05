import { useCallback, useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import {
  getReminders,
  runRemindersNow,
  updateReminderSettings,
  type RemindersData,
} from '../lib/api'

export default function PaymentRemindersPage() {
  const [data, setData] = useState<RemindersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await getReminders())
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

  async function handleAutoSendToggle(enabled: boolean) {
    if (!data) return
    setSaving(true)
    try {
      const payload = enabled
        ? {
            autoRemindersEnabled: true,
            emailEnabled: true,
            smsEnabled: true,
          }
        : {
            autoRemindersEnabled: false,
            emailEnabled: false,
            smsEnabled: false,
          }
      const { settings } = await updateReminderSettings(payload)
      setData({ ...data, settings })
      showToast('Reminder settings saved')
    } catch {
      showToast('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(
    key: keyof RemindersData['settings'],
    value: boolean,
  ) {
    if (!data) return
    setSaving(true)
    try {
      const { settings } = await updateReminderSettings({ [key]: value })
      setData({ ...data, settings })
      showToast('Reminder settings saved')
    } catch {
      showToast('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleRunNow() {
    try {
      const result = await runRemindersNow()
      showToast(result.message)
      await load()
    } catch {
      showToast('Failed to run reminders')
    }
  }

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
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Payment Reminders
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            BuildFlow acts as the &ldquo;bad guy&rdquo; — automated gentle-to-firm
            reminders so you don&apos;t have to chase clients yourself.
          </p>
        </div>

        {toast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {toast}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Automated reminders
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Email and text reminders sent on the schedule below.
              </p>
            </div>
            <button
              onClick={handleRunNow}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Run reminders now
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <ToggleRow
              label="Auto-send payment reminders"
              checked={data?.settings.autoRemindersEnabled ?? true}
              disabled={saving}
              onChange={handleAutoSendToggle}
            />
            <ToggleRow
              label="Email reminders"
              checked={
                data?.settings.autoRemindersEnabled
                  ? (data?.settings.emailEnabled ?? true)
                  : false
              }
              disabled={saving || !data?.settings.autoRemindersEnabled}
              onChange={(v) => handleToggle('emailEnabled', v)}
            />
            <ToggleRow
              label="Text message reminders"
              checked={
                data?.settings.autoRemindersEnabled
                  ? (data?.settings.smsEnabled ?? true)
                  : false
              }
              disabled={saving || !data?.settings.autoRemindersEnabled}
              onChange={(v) => handleToggle('smsEnabled', v)}
            />
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Escalation schedule
            </p>
            <div className="mt-2 space-y-2">
              {data?.escalationSchedule.map((step) => (
                <div
                  key={`${step.days}-${step.tone}`}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <ToneBadge tone={step.tone} />
                  <span className="text-sm text-slate-700">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {(['gentle', 'reminder', 'firm'] as const).map((tone) => (
            <TemplateCard
              key={tone}
              tone={tone}
              template={data?.templates[tone]}
            />
          ))}
        </section>

        <section className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Milestone escrow & pre-authorization
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            For smaller residential jobs, clients pre-authorize the next milestone
            via credit card or ACH. Funds release automatically when both parties
            approve the completed phase.
          </p>
          <div className="mt-4 rounded-xl border border-brand-200 bg-white p-4">
            <ToggleRow
              label="Pre-authorization on payment links"
              checked={data?.settings.escrowEnabled ?? false}
              disabled={saving}
              onChange={(v) => handleToggle('escrowEnabled', v)}
            />
            <p className="mt-2 text-xs text-slate-500">Stripe integration coming soon</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Reminder history
          </h2>
          {!data?.log.length ? (
            <p className="mt-4 text-sm text-slate-500">
              No reminders sent yet. They&apos;ll appear here when auto-send runs or
              you click &ldquo;Run reminders now.&rdquo;
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {data.log.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone={entry.tone} />
                    <span className="text-xs text-slate-500">
                      {entry.channel} · {new Date(entry.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{entry.messagePreview}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 p-4 hover:border-slate-200">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
    </label>
  )
}

function ToneBadge({ tone }: { tone: string }) {
  const styles: Record<string, string> = {
    gentle: 'bg-emerald-100 text-emerald-800',
    reminder: 'bg-amber-100 text-amber-800',
    firm: 'bg-red-100 text-red-800',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${styles[tone] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {tone}
    </span>
  )
}

function TemplateCard({
  tone,
  template,
}: {
  tone: 'gentle' | 'reminder' | 'firm'
  template?: { emailSubject: string; emailBody: string; smsBody: string }
}) {
  if (!template) return null
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <ToneBadge tone={tone} />
      <p className="mt-2 text-xs font-medium text-slate-500">SMS preview</p>
      <p className="mt-1 text-sm text-slate-800">{template.smsBody}</p>
      <p className="mt-3 text-xs font-medium text-slate-500">Email subject</p>
      <p className="text-sm font-semibold text-slate-900">{template.emailSubject}</p>
    </div>
  )
}
