/** Decreta amblemi (favicon ile aynı) — arayüzde marka işareti olarak kullanılır. */
export function Logo({ size = 24 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Decreta"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="dcr-logo-bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="32">
          <stop offset="0" stopColor="#274468" />
          <stop offset="1" stopColor="#1a3252" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="7" fill="url(#dcr-logo-bg)" />
      <rect
        x="3.5"
        y="3.5"
        width="25"
        height="25"
        rx="4.5"
        fill="none"
        stroke="#f5f4f0"
        strokeOpacity="0.28"
        strokeWidth="1"
      />
      <path d="M10 7 H16 A9 9 0 0 1 16 25 H10 Z" fill="#f5f4f0" />
      <path d="M14 11 H16 A5 5 0 0 1 16 21 H14 Z" fill="url(#dcr-logo-bg)" />
    </svg>
  );
}
