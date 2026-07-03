import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import {
  applyCalendarRecommendation,
  disconnectCalendar,
  getCalendar,
  syncAllCalendars,
  type CalendarData,
  type CalendarRecommendation,
} from '../lib/api'

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await getCalendar()
      setData(result)
      setError(null)
    } catch {
      setError('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('error')
    if (connected === 'google') {
      showToast('Google Calendar connected — milestone updates will sync automatically')
      setSearchParams({}, { replace: true })
      load()
    } else if (oauthError) {
      showToast('Calendar connection failed. Try again.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleCopyFeed() {
    if (!data?.feedUrl) return
    navigator.clipboard.writeText(data.feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleConnectGoogle() {
    window.location.href = '/api/calendar/oauth/google'
  }

  async function handleDisconnect(provider: 'google' | 'outlook') {
    await disconnectCalendar(provider)
    showToast(`${provider === 'google' ? 'Google' : 'Outlook'} calendar disconnected`)
    load()
  }

  async function handleApplyRecommendation(rec: CalendarRecommendation) {
    try {
      const result = await applyCalendarRecommendation(rec.id)
      showToast(result.message)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to apply schedule change')
    }
  }

  async function handleSyncAll() {
    try {
      const result = await syncAllCalendars()
      showToast(result.message)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sync failed')
    }
  }

  const googleConnected = data?.connections.some(
    (c) => c.provider === 'google' && c.status === 'connected',
  )
  const outlookConnected = data?.connections.some(
    (c) => c.provider === 'outlook' && c.status === 'connected',
  )

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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Calendar
            </h1>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              AI Schedule
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Sync milestone dates to Google or Outlook. AI reviews client messages
            and recommends schedule adjustments.
          </p>
        </div>

        {toast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {toast}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Calendar integration
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            No standalone calendar database — milestones publish as a standard
            iCal feed. When a due date changes, linked calendars update
            automatically.
          </p>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                iCal subscription URL
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Add this URL in Google Calendar → Settings → Add calendar → From
                URL, or Outlook → Add calendar → Subscribe from web.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={data?.feedUrl ?? ''}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700"
                />
                <button
                  onClick={handleCopyFeed}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
              {data?.googleCalendarSubscribeUrl && (
                <a
                  href={data.googleCalendarSubscribeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-500"
                >
                  Open in Google Calendar →
                </a>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <IntegrationCard
                name="Google Calendar"
                description="Two-way sync — milestone date changes push updates to your calendar instantly."
                connected={!!googleConnected}
                onConnect={handleConnectGoogle}
                onDisconnect={() => handleDisconnect('google')}
                onSync={googleConnected ? handleSyncAll : undefined}
                icon="google"
              />
              <IntegrationCard
                name="Outlook"
                description="Microsoft 365 calendar sync via Graph API."
                connected={!!outlookConnected}
                onConnect={() =>
                  showToast('Outlook OAuth — add MICROSOFT_CLIENT_ID to .env to enable')
                }
                onDisconnect={() => handleDisconnect('outlook')}
                icon="outlook"
                comingSoon
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                AI schedule recommendations
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Based on incoming client messages, AI suggests adjustments to
                your work schedule.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {data?.recommendations.filter((r) => r.status === 'pending').length ?? 0}{' '}
              pending
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {data?.recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onApply={() => handleApplyRecommendation(rec)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Upcoming milestones
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Events synced from your project milestones. Updates when due dates
            change in cash flow.
          </p>

          {!data?.events.length ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              No milestone dates yet. Add due dates on project cash flow to see
              events here.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {data.events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {event.stageName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {event.projectName} · {event.clientName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {event.syncedProviders.length > 0 && (
                      <div className="flex gap-1">
                        {event.syncedProviders.map((p) => (
                          <span
                            key={p}
                            className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-sm font-bold text-slate-700">
                      {formatDate(event.displayDate!)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        event.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : event.status === 'invoiced'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}

function IntegrationCard({
  name,
  description,
  connected,
  onConnect,
  onDisconnect,
  onSync,
  icon,
  comingSoon,
}: {
  name: string
  description: string
  connected: boolean
  onConnect: () => void
  onDisconnect: () => void
  onSync?: () => void
  icon: 'google' | 'outlook'
  comingSoon?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
          {icon === 'google' ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#0078D4" d="M21.5 4.5H12v7.875h9.75V4.5zM12 12.375H2.25v7.125H12V12.375zM2.25 4.5v7.875H12V4.5H2.25zM12 21h9.5c.825 0 1.5-.675 1.5-1.5V12.375H12V21z" />
            </svg>
          )}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{name}</p>
          {connected ? (
            <span className="text-xs font-medium text-emerald-600">Connected</span>
          ) : comingSoon ? (
            <span className="text-xs font-medium text-slate-400">Coming soon</span>
          ) : (
            <span className="text-xs font-medium text-slate-400">Not connected</span>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {connected ? (
          <>
            {onSync && (
              <button
                onClick={onSync}
                className="text-xs font-semibold text-brand-600 hover:text-brand-500"
              >
                Sync milestones now
              </button>
            )}
            <button
              onClick={onDisconnect}
              className="text-xs font-semibold text-red-600 hover:text-red-500"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Connect {name}
          </button>
        )}
      </div>
    </div>
  )
}

function RecommendationCard({
  rec,
  onApply,
}: {
  rec: CalendarRecommendation
  onApply: () => void
}) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {rec.projectName}
            <span className="ml-2 font-normal text-slate-500">
              from {rec.clientName}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Re: {rec.milestoneName}
            {rec.currentDate && (
              <span> · current target {formatDate(rec.currentDate)}</span>
            )}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            rec.priority === 'high'
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {rec.priority}
        </span>
      </div>

      <blockquote className="mt-3 border-l-2 border-slate-200 pl-3 text-sm italic text-slate-600">
        "{rec.sourceMessage}"
      </blockquote>

      <div className="mt-3 rounded-lg bg-white px-3 py-2">
        <p className="text-xs font-medium text-brand-700">AI recommendation</p>
        <p className="mt-1 text-sm text-slate-800">{rec.suggestion}</p>
        {rec.suggestedDate && (
          <p className="mt-2 text-xs font-semibold text-slate-600">
            Suggested date: {formatDate(rec.suggestedDate)}
          </p>
        )}
      </div>

      {rec.status === 'pending' && (
        <button
          onClick={onApply}
          className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-400"
        >
          Apply to schedule
        </button>
      )}
      {rec.status === 'applied' && (
        <p className="mt-3 text-xs font-medium text-emerald-600">Applied to schedule</p>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
