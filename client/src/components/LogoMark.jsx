// export const LogoMark = ({ className = "w-8 h-8" }) => (
//   <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
//     <rect width="32" height="32" rx="8" fill="#16171D" />
//     <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="#24262E" />
//     <rect x="8" y="6" width="3" height="16" rx="1.5" fill="#FF6A3D" />
//     <rect x="21" y="10" width="3" height="16" rx="1.5" fill="#4DD6C8" />
//   </svg>
// )



export const LogoMark = ({ className = "w-8 h-8" }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="8" fill="#16171D" />
    <rect
      x="0.5"
      y="0.5"
      width="31"
      height="31"
      rx="7.5"
      stroke="#24262E"
    />

    {/* < */}
    <path
      d="M9 9L4 16L9 23"
      stroke="#FF6A3D"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* / */}
    <path
      d="M19 8L15 24"
      stroke="#FF6A3D"
      strokeWidth="2.8"
      strokeLinecap="round"
    />

    {/* > */}
    <path
      d="M23 9L28 16L23 23"
      stroke="#4DD6C8"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
