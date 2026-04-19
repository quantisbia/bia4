export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full animate-fadeIn">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-32 rounded-md bg-white/[0.04] animate-pulse" />
        </div>
        <div className="h-8 w-24 rounded-xl bg-white/[0.06] animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse" />
              <div className="w-4 h-4 rounded bg-white/[0.04] animate-pulse" />
            </div>
            <div className="h-8 w-16 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-24 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse" />
        <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-2.5 w-1/2 rounded bg-white/[0.04] animate-pulse" />
                </div>
                <div className="h-4 w-12 rounded bg-white/[0.06] animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pulsing BIA logo indicator */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-2 h-2 rounded-full bg-violet-500/40 animate-pulse" />
          <span className="text-xs">Carregando módulos BIA...</span>
        </div>
      </div>
    </div>
  )
}
