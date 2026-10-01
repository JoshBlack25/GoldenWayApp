/**
 * Stylized city-map canvas drawn as SVG — no map SDK needed for the
 * prototype. Used on the Home screen (light) and the Route 42 detail
 * screen (dark). The bus marker position animates along the route.
 */
export default function MapCanvas({ dark = false, compact = false }) {
  const bg = dark ? "#10131c" : "#eef0e9";
  const block = dark ? "#1a1f2e" : "#e2e5da";
  const road = dark ? "#242b3d" : "#f7f8f4";
  const roadMinor = dark ? "#1d2333" : "#eef0e9";
  const park = dark ? "#15202b" : "#dfe8d8";
  const water = dark ? "#101a2e" : "#d7e4ea";
  const route = "#e8b923";
  const routeSoft = dark ? "#3a3320" : "#f3e3b0";

  return (
    <svg
      viewBox="0 0 360 220"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="img"
      aria-label="Stylized map with the bus route highlighted"
    >
      <rect width="360" height="220" fill={bg} />

      {/* park + water features */}
      <rect x="18" y="18" width="70" height="52" rx="6" fill={park} />
      <path d="M262 0h98v60c-38 10-72-6-98-22Z" fill={water} opacity="0.9" />
      <rect x="286" y="150" width="60" height="56" rx="6" fill={park} />

      {/* city blocks */}
      <g fill={block}>
        <rect x="104" y="14" width="58" height="40" rx="4" />
        <rect x="172" y="14" width="72" height="40" rx="4" />
        <rect x="14" y="86" width="66" height="46" rx="4" />
        <rect x="14" y="146" width="66" height="60" rx="4" />
        <rect x="96" y="70" width="54" height="62" rx="4" />
        <rect x="160" y="70" width="86" height="30" rx="4" />
        <rect x="160" y="110" width="86" height="42" rx="4" />
        <rect x="256" y="110" width="46" height="42" rx="4" />
        <rect x="96" y="146" width="54" height="60" rx="4" />
        <rect x="160" y="166" width="86" height="40" rx="4" />
      </g>

      {/* roads */}
      <g stroke={road} strokeWidth="9" strokeLinecap="round">
        <path d="M0 64h360" />
        <path d="M0 138h360" />
        <path d="M88 0v220" />
        <path d="M254 0v220" />
      </g>
      <g stroke={roadMinor} strokeWidth="4.5" strokeLinecap="round">
        <path d="M0 22h360" />
        <path d="M0 106h360" />
        <path d="M0 190h360" />
        <path d="M160 0v220" />
        <path d="M320 0v220" />
        <path d="M40 0v220" />
      </g>

      {/* highlighted route */}
      <path
        d="M40 196 L40 138 L120 138 L120 64 L254 64 L254 24"
        fill="none"
        stroke={routeSoft}
        strokeWidth={compact ? 7 : 9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 196 L40 138 L120 138 L120 64 L254 64 L254 24"
        fill="none"
        stroke={route}
        strokeWidth={compact ? 3.5 : 4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* endpoints */}
      <circle cx="40" cy="196" r="7" fill="#fff" stroke={route} strokeWidth="4" />
      <circle cx="254" cy="24" r="7" fill={route} stroke="#fff" strokeWidth="3" />

      {/* bus marker */}
      {!compact && (
        <g transform="translate(120 64)">
          <circle r="13" fill={route} opacity="0.25">
            <animate attributeName="r" values="11;16;11" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle r="9.5" fill={route} stroke="#fff" strokeWidth="2.5" />
          <g transform="translate(-4.5 -4.5) scale(0.38)">
            <rect x="2" y="4" width="20" height="15" rx="3" fill="#241f10" />
            <path d="M4 19v2.6M20 19v2.6" stroke="#241f10" strokeWidth="2.4" strokeLinecap="round" />
            <rect x="5" y="7" width="5" height="4" rx="1" fill={route} />
            <rect x="14" y="7" width="5" height="4" rx="1" fill={route} />
          </g>
        </g>
      )}
    </svg>
  );
}
