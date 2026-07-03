import AppLayout from '../components/AppLayout'

const PLAN_FEATURES = [
  'Unlimited projects & cash flow tracking',
  'Company-wide financial dashboard',
  'Automated payment reminders (email & SMS)',
  'AI-drafted customer responses',
  'Subcontractor & milestone management',
  'Priority support',
]

export default function MembershipPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Membership
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            One simple plan with everything you need to run your contracting business.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border-2 border-brand-300 bg-white shadow-lg">
          <div className="absolute right-4 top-4 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Current Plan
          </div>

          <div className="border-b border-slate-100 bg-gradient-to-br from-brand-50 to-white px-6 py-8 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              BuildFlow Pro
            </p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-5xl font-extrabold text-slate-900">
                $49.99
              </span>
              <span className="text-slate-500">/ month</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Billed monthly · Cancel anytime
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <ul className="space-y-3">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              disabled
              className="mt-8 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white opacity-90"
            >
              You're on BuildFlow Pro
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Payment processing coming soon
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">14-day free trial</span> included
          with new accounts. Your trial status and billing history will appear here once
          payments are enabled.
        </div>
      </div>
    </AppLayout>
  )
}
