import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import { getSettings, updateSettings } from '../lib/api'

export default function SettingsPage() {
  const { user } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [autoReminders, setAutoReminders] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [integrations, setIntegrations] = useState<{
    googleCalendar: string
    outlookCalendar: string
    emailDelivery: string
    smsDelivery: string
    quickbooks: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getSettings()
      setCompanyName(data.company.companyName)
      setBusinessPhone(data.company.businessPhone)
      setAutoReminders(data.notifications.autoRemindersEnabled)
      setEmailEnabled(data.notifications.emailEnabled)
      setSmsEnabled(data.notifications.smsEnabled)
      setIntegrations(data.integrations)
      setError(null)
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const notifications = {
        autoRemindersEnabled: autoReminders,
        emailEnabled: autoReminders ? emailEnabled : false,
        smsEnabled: autoReminders ? smsEnabled : false,
      }
      const data = await updateSettings({
        companyName,
        businessPhone,
        notifications,
      })
      setCompanyName(data.company.companyName)
      setBusinessPhone(data.company.businessPhone)
      setAutoReminders(data.notifications.autoRemindersEnabled)
      setEmailEnabled(data.notifications.emailEnabled)
      setSmsEnabled(data.notifications.smsEnabled)
      setIntegrations(data.integrations)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function handleAutoRemindersChange(enabled: boolean) {
    setAutoReminders(enabled)
    if (!enabled) {
      setEmailEnabled(false)
      setSmsEnabled(false)
    } else {
      setEmailEnabled(true)
      setSmsEnabled(true)
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
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Company info and notification preferences — synced with Payment Reminders.
          </p>
        </div>

        {saved && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Settings saved
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
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
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Payment reminders
              </h2>
              <Link
                to="/dashboard/reminders"
                className="text-xs font-semibold text-brand-600 hover:text-brand-500"
              >
                View schedule →
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              <Toggle
                label="Auto-send payment reminders"
                description="Same setting as the Reminders tab"
                checked={autoReminders}
                onChange={handleAutoRemindersChange}
              />
              <Toggle
                label="Email reminders"
                description="Send automated payment emails to clients"
                checked={autoReminders ? emailEnabled : false}
                disabled={!autoReminders}
                onChange={setEmailEnabled}
              />
              <Toggle
                label="Text message reminders"
                description="Send automated payment texts to clients"
                checked={autoReminders ? smsEnabled : false}
                disabled={!autoReminders}
                onChange={setSmsEnabled}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Integrations
            </h2>
            <div className="mt-4 space-y-3">
              <IntegrationRow
                name="Google Calendar"
                status={
                  integrations?.googleCalendar === 'connected'
                    ? 'Connected'
                    : 'Not connected'
                }
                href="/dashboard/calendar"
              />
              <IntegrationRow
                name="Outlook Calendar"
                status={
                  integrations?.outlookCalendar === 'connected'
                    ? 'Connected'
                    : 'Not connected'
                }
                href="/dashboard/calendar"
              />
              <IntegrationRow
                name="Email delivery (SMTP)"
                status={
                  integrations?.emailDelivery === 'configured'
                    ? 'Configured'
                    : 'Add SMTP to .env'
                }
              />
              <IntegrationRow
                name="SMS delivery (Twilio)"
                status={
                  integrations?.smsDelivery === 'configured'
                    ? 'Configured'
                    : 'Add Twilio to .env'
                }
              />
              <IntegrationRow name="QuickBooks" status="Not connected" />
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save settings'}
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
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-500' : 'bg-slate-200'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
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
  href,
}: {
  name: string
  status: string
  href?: string
}) {
  const content = (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-800">{name}</span>
      <span className="text-xs text-slate-500">{status}</span>
    </div>
  )

  if (href) {
    return (
      <Link to={href} className="block transition-colors hover:opacity-80">
        {content}
      </Link>
    )
  }

  return content
}

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
