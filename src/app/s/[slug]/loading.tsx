export default function Loading() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl animate-pulse flex-col" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="size-10 rounded-full bg-surface" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded-chip bg-surface" />
          <div className="h-3 w-48 rounded-chip bg-surface" />
        </div>
      </div>
      <div className="flex-1 space-y-3 px-4 py-10">
        <div className="h-8 w-3/4 rounded-chip bg-surface" />
        <div className="h-4 w-1/2 rounded-chip bg-surface" />
      </div>
      <div className="m-4 h-14 rounded-card bg-surface" />
    </main>
  );
}
