import AppLayout from '../components/AppLayout'

export default function Projects() {
  return (
    <AppLayout>
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
          <svg className="h-7 w-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
          Select a project
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Pick a project from the sidebar to view its cash flow, or create a new one with the + button.
        </p>
      </div>
    </AppLayout>
  )
}
