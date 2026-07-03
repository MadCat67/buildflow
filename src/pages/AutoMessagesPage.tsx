import { useState } from 'react'
import AppLayout from '../components/AppLayout'

type Channel = 'email' | 'sms'
type SavedResponse = {
  id: string
  title: string
  channel: Channel
  body: string
  createdAt: string
}

const SAMPLE_QUESTIONS = [
  'When will the kitchen renovation be finished?',
  'Can you send me an updated invoice for the framing milestone?',
  'What time will the crew arrive tomorrow?',
]

const SAMPLE_DRAFTS: Record<Channel, string> = {
  email: `Hi Sarah,

Thanks for reaching out! The kitchen renovation is on track. Framing is complete and we're moving into rough-in plumbing and electrical next week. Based on our current schedule, we expect substantial completion by mid-August.

I'll send over the updated framing invoice today. Let me know if you have any other questions!

Best,
Your BuildFlow Team`,
  sms: `Hi Sarah! Kitchen reno is on track — framing done, rough-in starts next week. Targeting mid-August for substantial completion. Framing invoice coming your way today. Reply anytime with questions!`,
}

export default function AutoMessagesPage() {
  const [channel, setChannel] = useState<Channel>('email')
  const [customerQuestion, setCustomerQuestion] = useState(SAMPLE_QUESTIONS[0])
  const [draft, setDraft] = useState(SAMPLE_DRAFTS.email)
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedResponses, setSavedResponses] = useState<SavedResponse[]>([
    {
      id: '1',
      title: 'Project timeline reply',
      channel: 'email',
      body: SAMPLE_DRAFTS.email,
      createdAt: 'Saved previously',
    },
  ])
  const [toast, setToast] = useState<string | null>(null)

  function handleGenerate() {
    setIsGenerating(true)
    setTimeout(() => {
      setDraft(SAMPLE_DRAFTS[channel])
      setIsGenerating(false)
    }, 800)
  }

  function handleChannelChange(next: Channel) {
    setChannel(next)
    setDraft(SAMPLE_DRAFTS[next])
  }

  function handleSave() {
    const title =
      customerQuestion.length > 40
        ? customerQuestion.slice(0, 40) + '…'
        : customerQuestion
    setSavedResponses((prev) => [
      {
        id: Date.now().toString(),
        title,
        channel,
        body: draft,
        createdAt: 'Just now',
      },
      ...prev,
    ])
    setToast('Response saved to your library')
    setTimeout(() => setToast(null), 3000)
  }

  function handleSend() {
    setToast(`Preview sent — ${channel === 'email' ? 'Email' : 'SMS'} delivery coming soon`)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Auto Messages
            </h1>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              AI Draft
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Save time with AI-drafted replies to customer emails and texts. Preview and
            edit before sending.
          </p>
        </div>

        {toast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {toast}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Customer inquiry
            </h2>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Quick examples
              </label>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setCustomerQuestion(q)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      customerQuestion === q
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {q.length > 35 ? q.slice(0, 35) + '…' : q}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-700">
                Customer question
              </span>
              <textarea
                value={customerQuestion}
                onChange={(e) => setCustomerQuestion(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Paste or type the customer's message…"
              />
            </label>

            <div>
              <span className="mb-2 block text-xs font-medium text-slate-700">
                Reply channel
              </span>
              <div className="flex gap-2">
                <ChannelButton
                  active={channel === 'email'}
                  onClick={() => handleChannelChange('email')}
                  label="Email"
                />
                <ChannelButton
                  active={channel === 'sms'}
                  onClick={() => handleChannelChange('sms')}
                  label="Text message"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Drafting…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Generate AI draft
                </>
              )}
            </button>
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Preview & send
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {channel === 'email' ? 'Email' : 'SMS'} preview
              </span>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-700">
                Edit draft before sending
              </span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={channel === 'sms' ? 5 : 12}
                className={inputClass}
              />
            </label>

            {channel === 'sms' && (
              <p className="text-xs text-slate-500">
                {draft.length} characters · SMS limit 160 recommended
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Save response
              </button>
              <button
                onClick={handleSend}
                className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
              >
                Send {channel === 'email' ? 'email' : 'text'}
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Saved responses
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Reuse drafts you've approved for common customer questions.
          </p>

          <div className="mt-4 space-y-3">
            {savedResponses.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.channel === 'email' ? 'Email' : 'SMS'} · {item.createdAt}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDraft(item.body)
                      setChannel(item.channel)
                      setToast('Loaded into preview')
                      setTimeout(() => setToast(null), 2000)
                    }}
                    className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-500"
                  >
                    Use
                  </button>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

function ChannelButton({
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
      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'border-brand-300 bg-brand-50 text-brand-700'
          : 'border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
