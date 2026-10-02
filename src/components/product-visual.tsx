export function ProductVisual({
  className = "",
  label = "Aster Nova Pro",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[#efe6d6] ${className}`}
      role="img"
      aria-label={label}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,#fff8ec,transparent_62%)]" />
      <svg
        viewBox="0 0 360 280"
        className="relative mx-auto h-full w-full max-w-[420px]"
        aria-hidden="true"
      >
        <ellipse cx="180" cy="232" rx="92" ry="14" fill="#1a1612" opacity="0.12" />
        <path
          d="M92 132c0-58 40-98 88-98s88 40 88 98"
          fill="none"
          stroke="#1a1612"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M104 128c0-46 34-78 76-78s76 32 76 78"
          fill="none"
          stroke="#c45c26"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="62" y="118" width="46" height="78" rx="18" fill="#1a1612" />
        <rect x="70" y="128" width="30" height="58" rx="12" fill="#f7f1e6" />
        <rect x="252" y="118" width="46" height="78" rx="18" fill="#1a1612" />
        <rect x="260" y="128" width="30" height="58" rx="12" fill="#f7f1e6" />
        <circle cx="85" cy="157" r="4" fill="#c45c26" />
        <circle cx="275" cy="157" r="4" fill="#c45c26" />
      </svg>
    </div>
  );
}
