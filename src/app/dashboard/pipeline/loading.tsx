export default function PipelineLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto w-full animate-fadeIn">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-40 rounded-md bg-white/[0.04] animate-pulse" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-violet-500/10 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
              <div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse" />
              <div className="h-3 w-full rounded bg-white/[0.04] animate-pulse" />
              <div className="h-2 w-full rounded-full bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="md:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
