export default function BillingLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-7 max-w-5xl mx-auto w-full animate-fadeIn">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-7 w-52 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-white/[0.04] animate-pulse" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
          <div className="h-4 w-20 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-8 w-32 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-2 w-full rounded-full bg-white/[0.06] animate-pulse" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] animate-pulse" />
            <div className="h-6 w-16 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-12 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-white/[0.06] pb-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-lg bg-white/[0.06] animate-pulse" />
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
            <div className="h-4 w-20 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-8 w-24 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-28 rounded bg-white/[0.04] animate-pulse" />
            <div className="space-y-2 mt-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-3 w-full rounded bg-white/[0.04] animate-pulse" />
              ))}
            </div>
            <div className="h-10 w-full rounded-xl bg-white/[0.06] animate-pulse mt-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
