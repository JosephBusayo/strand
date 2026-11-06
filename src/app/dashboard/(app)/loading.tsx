export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-chip bg-surface" />
        <div className="h-8 w-56 rounded-chip bg-surface" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-card bg-surface" />
        ))}
      </div>
      <div className="h-48 rounded-card bg-surface" />
    </div>
  );
}
