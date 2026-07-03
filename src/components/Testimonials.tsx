const testimonials = [
  {
    quote:
      'We used to lose leads because nobody called back fast enough. BuildFlow\'s automated follow-ups alone paid for the subscription in the first month.',
    name: 'Marcus Chen',
    role: 'Owner, Chen Renovations',
    initials: 'MC',
  },
  {
    quote:
      'Scheduling five crews across twelve job sites was a nightmare. Now I drag and drop assignments and everyone gets a notification. Game changer.',
    name: 'Rachel Torres',
    role: 'Operations Manager, Torres Build Co.',
    initials: 'RT',
  },
  {
    quote:
      'Our clients love the progress updates with photos. We look more professional, and I spend less time on the phone explaining where things stand.',
    name: 'David Okonkwo',
    role: 'General Contractor, Okonkwo Homes',
    initials: 'DO',
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Trusted by pros
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built with contractors, for contractors
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6"
            >
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 text-brand-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-slate-700">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-display text-sm font-bold text-brand-700">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
