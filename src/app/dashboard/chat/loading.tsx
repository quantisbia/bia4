export default function ChatLoading() {
  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* Chat header */}
      <div className="border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-3 w-40 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* AI welcome message */}
        <div className="flex gap-3 max-w-[80%]">
          <div className="w-8 h-8 rounded-full bg-violet-500/10 animate-pulse shrink-0" />
          <div className="rounded-2xl rounded-tl-sm bg-white/[0.03] border border-white/[0.06] p-4 space-y-2 flex-1">
            <div className="h-3 w-full rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-3/5 rounded bg-white/[0.04] animate-pulse" />
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 pl-11">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-32 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 h-12 rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 animate-pulse shrink-0" />
        </div>
      </div>
    </div>
  )
}
