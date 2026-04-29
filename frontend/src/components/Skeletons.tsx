export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card animate-fade-in">
      <div className="skeleton h-4 w-1/3 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3 mb-2" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 rounded-xl" />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  )
}
