export default function ReviewsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-border bg-card rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="bg-muted h-4 w-40 animate-pulse rounded" />
              <div className="bg-muted h-4 w-20 animate-pulse rounded" />
            </div>
            <div className="bg-muted h-3 w-full animate-pulse rounded" />
            <div className="bg-muted mt-2 h-3 w-3/4 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
