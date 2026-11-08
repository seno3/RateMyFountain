// Gold water drop on a dark tile. Decorative: the site name always sits next to it.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#111113" />
      <path
        d="M16 6.5c3.6 4.5 6.5 8.4 6.5 12a6.5 6.5 0 0 1-13 0c0-3.6 2.9-7.5 6.5-12Z"
        fill="#CFB991"
      />
      <path d="M13 19.5a3 3 0 0 0 3 3" stroke="#111113" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
