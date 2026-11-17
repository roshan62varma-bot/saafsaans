/** Brand mark: a leaf-shaped breath over a clean horizon. Decorative. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="10" className="fill-accent" />
      <path
        d="M10 26c4-10 12-14 20-14-1 8-6 16-16 16-1.5 0-3-.7-4-2z"
        className="fill-accent-ink"
        opacity="0.95"
      />
      <path d="M8 31h24" className="stroke-accent-ink" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
