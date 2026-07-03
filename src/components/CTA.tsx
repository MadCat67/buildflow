export default function CTA() {
  return (
    <section id="cta" className="bg-slate-950 py-24 lg:py-32">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="hero-glow absolute inset-0 rounded-3xl" />

        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 px-8 py-16 text-center sm:px-16 lg:py-20">
          <div className="grid-pattern absolute inset-0 opacity-40" />

          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to build smarter?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
              Join thousands of contractors who run their business on BuildFlow.
              Start your free 14-day trial — no credit card, no commitment.
            </p>

            <form
              className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                aria-label="Email address"
              />
              <button
                type="submit"
                className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-500/40"
              >
                Start free trial
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-500">
              Free for 14 days · Setup in under 10 minutes · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
