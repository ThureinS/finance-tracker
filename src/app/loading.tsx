export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="size-9 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="mb-3 h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-card">
        <div className="border-b p-6 pb-4">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-col gap-4 p-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
