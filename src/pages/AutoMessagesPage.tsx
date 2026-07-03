import { useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'

type Channel = 'email' | 'sms'
type MessageStatus = 'pending' | 'approved' | 'sent'
type InboxFilter = 'all' | Channel

type IncomingMessage = {
  id: string
  clientName: string
  projectName: string
  channel: Channel
  body: string
  receivedAt: string
  status: MessageStatus
  aiDraft: string
}

const MOCK_INBOX: IncomingMessage[] = [
  {
    id: '1',
    clientName: 'Sarah Johnson',
    projectName: 'Kitchen Renovation',
    channel: 'email',
    body: 'Hi — when will the kitchen renovation be finished? We have family visiting mid-August and want to plan around it.',
    receivedAt: 'Today, 9:14 AM',
    status: 'pending',
    aiDraft: `Hi Sarah,

Thanks for reaching out! The kitchen renovation is on track. Framing is complete and we're moving into rough-in plumbing and electrical next week. Based on our current schedule, we expect substantial completion by mid-August — right in time for your visitors.

I'll keep you posted as we hit each milestone. Let me know if you have any other questions!

Best regards`,
  },
  {
    id: '2',
    clientName: 'Sarah Johnson',
    projectName: 'Kitchen Renovation',
    channel: 'sms',
    body: 'Can you send me the updated invoice for the framing milestone? Need it for our records.',
    receivedAt: 'Yesterday, 4:32 PM',
    status: 'pending',
    aiDraft: `Hi Sarah! Absolutely — I'll send over the updated framing milestone invoice today. You should have it in your inbox shortly. Let me know if you need anything else!`,
  },
  {
    id: '3',
    clientName: 'Mike & Lisa Chen',
    projectName: 'Bathroom Remodel',
    channel: 'email',
    body: 'What time will the crew arrive tomorrow? We need to make sure someone is home to let them in.',
    receivedAt: 'Yesterday, 11:05 AM',
    status: 'pending',
    aiDraft: `Hi Mike and Lisa,

The crew is scheduled to arrive tomorrow between 7:30–8:00 AM. I'll have the foreman text you when they're 15 minutes out so you can plan accordingly.

Thanks,
Your BuildFlow Team`,
  },
  {
    id: '4',
    clientName: 'David Park',
    projectName: 'Deck Addition',
    channel: 'sms',
    body: 'Looks great so far! Quick question — are we still on budget for materials?',
    receivedAt: 'Mon, 2:18 PM',
    status: 'sent',
    aiDraft: `Hi David! Yes, we're still on budget for materials. I'll send a quick cost summary with the next progress update. Thanks for checking in!`,
  },
  {
    id: '5',
    clientName: 'Sarah Johnson',
    projectName: 'Kitchen Renovation',
    channel: 'email',
    body: 'Thanks for the update last week — really appreciate the transparency on the timeline.',
    receivedAt: 'Last week',
    status: 'approved',
    aiDraft: `Hi Sarah,

You're very welcome — glad the update was helpful! We'll continue to keep you in the loop as work progresses. Don't hesitate to reach out anytime.

Best regards`,
  },
]

export default function AutoMessagesPage() {
  const [contactEmail, setContactEmail] = useState('hello@oakstreetbuilders.com')
  const [contactPhone, setContactPhone] = useState('(555) 234-8901')
  const [contactSaved, setContactSaved] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)

  const [messages, setMessages] = useState<IncomingMessage[]>(MOCK_INBOX)
  const [selectedId, setSelectedId] = useState<string>(MOCK_INBOX[0].id)
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)

  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages
    return messages.filter((m) => m.channel === filter)
  }, [messages, filter])

  const selected = filteredMessages.find((m) => m.id === selectedId) ?? filteredMessages[0]
  const draft = selected
    ? (draftEdits[selected.id] ?? selected.aiDraft)
    : ''

  const pendingCount = messages.filter((m) => m.status === 'pending').length

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleSaveContact() {
    setContactSaved(true)
    setShowContactForm(false)
    showToast('Contact info saved — clients can reach you at these addresses')
    setTimeout(() => setContactSaved(false), 2500)
  }

  function handleDraftChange(value: string) {
    if (!selected) return
    setDraftEdits((prev) => ({ ...prev, [selected.id]: value }))
  }

  function handleRegenerate() {
    if (!selected) return
    setDraftEdits((prev) => {
      const next = { ...prev }
      delete next[selected.id]
      return next
    })
    showToast('AI draft regenerated')
  }

  function handleApprove() {
    if (!selected) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === selected.id ? { ...m, status: 'approved' as const } : m,
      ),
    )
    showToast('Response approved — ready to send')
  }

  function handleSend() {
    if (!selected) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === selected.id ? { ...m, status: 'sent' as const } : m,
      ),
    )
    showToast(
      `${selected.channel === 'email' ? 'Email' : 'Text'} sent to ${selected.clientName} (UI preview)`,
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Auto Messages
            </h1>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {pendingCount} awaiting review
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            View incoming client emails and texts. AI drafts a reply for you to
            edit and approve before sending.
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
                Your contact info
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Clients send messages to these addresses. Connect your inbox and
                phone to sync incoming messages.
              </p>
            </div>
            <button
              onClick={() => setShowContactForm(!showContactForm)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showContactForm ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {showContactForm ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  Business email
                </span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@company.com"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  Business phone (SMS)
                </span>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={inputClass}
                  placeholder="(555) 123-4567"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  onClick={handleSaveContact}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
                >
                  Save contact info
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-4">
              <ContactBadge
                icon="email"
                label="Email"
                value={contactEmail}
                saved={contactSaved}
              />
              <ContactBadge
                icon="phone"
                label="Text / SMS"
                value={contactPhone}
                saved={contactSaved}
              />
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                Inbox
              </h2>
              <span className="text-xs text-slate-500">
                {filteredMessages.length} message
                {filteredMessages.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex gap-1.5">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
              <FilterChip active={filter === 'email'} onClick={() => setFilter('email')} label="Email" />
              <FilterChip active={filter === 'sms'} onClick={() => setFilter('sms')} label="Text" />
            </div>

            <div className="max-h-[32rem] space-y-1.5 overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No messages in this filter.
                </p>
              ) : (
                filteredMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedId(msg.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected?.id === msg.id
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {msg.clientName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {msg.projectName}
                        </p>
                      </div>
                      <StatusBadge status={msg.status} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                      {msg.body}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <ChannelIcon channel={msg.channel} />
                      <span>{msg.channel === 'email' ? 'Email' : 'Text'}</span>
                      <span>·</span>
                      <span>{msg.receivedAt}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {selected && (
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      {selected.clientName}
                    </h2>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {selected.projectName} · {selected.receivedAt}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <ChannelIcon channel={selected.channel} />
                  {selected.channel === 'email' ? 'Email' : 'Text message'}
                </span>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Incoming message
                </p>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-sm leading-relaxed text-slate-800">
                    {selected.body}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    AI draft response
                  </p>
                  <button
                    onClick={handleRegenerate}
                    disabled={selected.status === 'sent'}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-500 disabled:opacity-40"
                  >
                    Regenerate
                  </button>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  disabled={selected.status === 'sent'}
                  rows={selected.channel === 'sms' ? 5 : 10}
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
                />
                {selected.channel === 'sms' && (
                  <p className="mt-1 text-xs text-slate-500">
                    {draft.length} characters
                  </p>
                )}
              </div>

              {selected.status === 'sent' ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Response sent to {selected.clientName}.
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={handleApprove}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Approve draft
                  </button>
                  <button
                    onClick={handleSend}
                    className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
                  >
                    Send {selected.channel === 'email' ? 'email' : 'text'}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function ContactBadge({
  icon,
  label,
  value,
  saved,
}: {
  icon: 'email' | 'phone'
  label: string
  value: string
  saved: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        {icon === 'email' ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.01M19.5 6.75l-7.5 4.5-7.5-4.5" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900">
          {value}
          {saved && (
            <span className="ml-2 text-xs font-normal text-emerald-600">Saved</span>
          )}
        </p>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}

function StatusBadge({ status }: { status: MessageStatus }) {
  const styles: Record<MessageStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-blue-100 text-blue-800',
    sent: 'bg-emerald-100 text-emerald-800',
  }
  const labels: Record<MessageStatus, string> = {
    pending: 'Review',
    approved: 'Approved',
    sent: 'Sent',
  }
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function ChannelIcon({ channel }: { channel: Channel }) {
  if (channel === 'email') {
    return (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  }
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
