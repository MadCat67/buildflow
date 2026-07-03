import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(true)
  const [paymentReminders, setPaymentReminders] = useState(true)
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your account and notification preferences.
          </p>
        </div>

        {saved && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Settings saved (UI preview — backend coming soon)
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">Profile</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-4">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name ?? 'User'}
                    className="h-14 w-14 rounded-full ring-2 ring-brand-200"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                    {user?.name?.charAt(0) ?? user?.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{user?.name ?? 'User'}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <p className="mt-1 text-xs text-slate-400">Signed in with Google</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">Company</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  Company name
                </span>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Oak Street Builders"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  Business phone
                </span>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Notifications
            </h2>
            <div className="mt-4 space-y-4">
              <Toggle
                label="Email notifications"
                description="Payment reminders and project updates via email"
                checked={emailNotifications}
                onChange={setEmailNotifications}
              />
              <Toggle
                label="SMS notifications"
                description="Text alerts for overdue bills and client payments"
                checked={smsNotifications}
                onChange={setSmsNotifications}
              />
              <Toggle
                label="Automated payment reminders"
                description="Send scheduled reminders to clients on invoiced milestones"
                checked={paymentReminders}
                onChange={setPaymentReminders}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Integrations
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Connect external services (coming soon)
            </p>
            <div className="mt-4 space-y-3">
              <IntegrationRow name="Google Calendar" status="Not connected" />
              <IntegrationRow name="QuickBooks" status="Not connected" />
              <IntegrationRow name="Twilio SMS" status="Configure in .env" />
            </div>
          </section>

          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-400"
          >
            Save settings
          </button>
        </form>
      </div>
    </AppLayout>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

function IntegrationRow({
  name,
  status,
}: {
  name: string
  status: string
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-800">{name}</span>
      <span className="text-xs text-slate-500">{status}</span>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
