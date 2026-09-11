export default function DiaryLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        <div className="bg-muted mt-2 h-4 w-32 animate-pulse rounded" />
      </div>
      <div className="flex flex-col gap-8">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g}>
            <div className="bg-muted mb-3 h-4 w-28 animate-pulse rounded" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-border bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="bg-muted h-4 w-40 animate-pulse rounded" />
                    <div className="bg-muted h-4 w-16 animate-pulse rounded" />
                  </div>
                  <div className="bg-muted mt-2 h-3 w-24 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
