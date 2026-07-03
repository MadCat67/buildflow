const steps = [
  {
    number: '01',
    title: 'Set up your workspace',
    description:
      'Add your team, subcontractors, and active projects in minutes. Import existing data or start fresh — no IT degree required.',
  },
  {
    number: '02',
    title: 'Automate the busywork',
    description:
      'Configure call and email workflows, schedule templates, and estimate forms. BuildFlow handles the follow-ups so you don\'t have to.',
  },
  {
    number: '03',
    title: 'Run jobs with confidence',
    description:
      'Track progress, manage finances, and communicate with everyone from a single dashboard. See the full picture at a glance.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Simple to start
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Up and running in three steps
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No complicated onboarding. BuildFlow is designed for busy contractors
            who need results today, not next quarter.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+2rem)] top-8 hidden h-0.5 w-[calc(100%-4rem)] bg-gradient-to-r from-brand-300 to-brand-100 md:block" />
                )}
                <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 font-display text-xl font-bold text-white shadow-lg shadow-brand-500/30">
                  {step.number}
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
          <Stat value="2,400+" label="Contractors onboarded" />
          <Stat value="18 hrs" label="Saved per week on average" />
          <Stat value="31%" label="More projects completed on time" />
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <p className="font-display text-3xl font-bold text-brand-600">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  )
}
