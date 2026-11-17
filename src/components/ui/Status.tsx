/** Loading placeholder that announces itself once to assistive tech. */
export function Loading({ label, lines = 3 }: { label: string; lines?: number }) {
  return (
    <div role="status" className="card space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} aria-hidden="true" className={`skeleton h-5 ${i % 2 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Error with a retry action. */
export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card space-y-3 border-2 border-danger">
      <p className="font-bold">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
