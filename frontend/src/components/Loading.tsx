export function Loading({ label = '正在加载题库…' }: { label?: string }) {
  return (
    <div className="loading-state">
      <span className="loading-ring" />
      <p>{label}</p>
    </div>
  )
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <span className="skeleton-line short" />
          <span className="skeleton-line" />
          <span className="skeleton-line" />
          <span className="skeleton-line medium" />
        </div>
      ))}
    </div>
  )
}
