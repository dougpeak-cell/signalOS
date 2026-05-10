import { useId } from "react";

export default function SigiEyeLogo({
  className = "",
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  const iconId = useId().replace(/:/g, "");
  const glowFilterId = `sigiLogoGlow-${iconId}`;
  const auraId = `sigiEyeAura-${iconId}`;

  return (
    <svg
      viewBox="0 0 260 150"
      className={className}
      role="img"
      aria-label="SigiOS scanning eye logo"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      <defs>
        <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id={auraId} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#0e7490" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>

      </defs>

      <style>{`
        .sigi-logo-scan-${iconId} {
          transform-origin: 130px 75px;
          animation: ${animate ? `sigiLogoScan-${iconId} 6.2s linear infinite` : "none"};
        }

        .sigi-logo-aura-${iconId} {
          transform-origin: 130px 75px;
          animation: ${animate ? `sigiLogoBreath-${iconId} 3.4s ease-in-out infinite` : "none"};
        }

        .sigi-logo-shell-${iconId} {
          animation: ${animate ? `sigiShellGlow-${iconId} 3.4s ease-in-out infinite` : "none"};
        }

        @keyframes sigiLogoScan-${iconId} {
          0% { transform: translateX(34px); opacity: 0; }
          8% { opacity: 1; }
          46% { transform: translateX(-34px); opacity: 1; }
          50% { transform: translateX(-34px); opacity: 0.65; }
          54% { transform: translateX(-34px); opacity: 1; }
          92% { transform: translateX(34px); opacity: 1; }
          100% { transform: translateX(34px); opacity: 0; }
        }

        @keyframes sigiLogoBreath-${iconId} {
          0%, 100% { opacity: 0.62; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.045); }
        }

        @keyframes sigiShellGlow-${iconId} {
          0%, 100% { opacity: 0.88; }
          50% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sigi-logo-scan-${iconId},
          .sigi-logo-aura-${iconId},
          .sigi-logo-shell-${iconId} {
            animation: none;
          }
        }
      `}</style>

      <ellipse
        className={`sigi-logo-aura-${iconId}`}
        cx="130"
        cy="75"
        rx="92"
        ry="66"
        fill={`url(#${auraId})`}
      />

      <path
        d="M61 75 H32 C20 75 20 44 34 44 C45 44 39 64 58 64"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
        filter={`url(#${glowFilterId})`}
      />

      <path
        d="M199 75 H228 C240 75 240 44 226 44 C215 44 221 64 202 64"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
        filter={`url(#${glowFilterId})`}
      />

      <ellipse
        className={`sigi-logo-shell-${iconId}`}
        cx="130"
        cy="75"
        rx="76"
        ry="50"
        fill="#03121c"
        stroke="#67e8f9"
        strokeWidth="8"
        filter={`url(#${glowFilterId})`}
      />

      <ellipse
        cx="130"
        cy="75"
        rx="61"
        ry="38"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.06"
        strokeWidth="2"
      />

      <g className={`sigi-logo-scan-${iconId}`}>
        <path
          d="M123 36 L137 36 L141 75 L137 114 L123 114 L119 75 Z"
          fill="#4ade80"
          opacity="0.28"
          filter={`url(#${glowFilterId})`}
        />
        <path
          d="M103 67 L157 67 L161 75 L157 83 L103 83 L99 75 Z"
          fill="#4ade80"
          opacity="0.2"
          filter={`url(#${glowFilterId})`}
        />
        <path
          d="M119.35 35 L121.15 35 L122.65 75 L121.15 115 L119.35 115 L117.85 75 Z"
          fill="#38bdf8"
          opacity="0.82"
          filter={`url(#${glowFilterId})`}
        />
        <path
          d="M100 72.4 L160 72.4 L160 77.6 L100 77.6 Z"
          fill="#38bdf8"
          opacity="0.78"
          filter={`url(#${glowFilterId})`}
        />
        <path
          d="M128 33 L132 33 L136 75 L132 117 L128 117 L124 75 Z"
          fill="#dcfce7"
          opacity="0.95"
          filter={`url(#${glowFilterId})`}
        />
        <path
          d="M109 73.8 L151 73.8 L151 76.2 L109 76.2 Z"
          fill="#dcfce7"
          opacity="0.95"
          filter={`url(#${glowFilterId})`}
        />
        <path
          d="M138.85 35 L140.65 35 L142.15 75 L140.65 115 L138.85 115 L137.35 75 Z"
          fill="#38bdf8"
          opacity="0.82"
          filter={`url(#${glowFilterId})`}
        />
      </g>
    </svg>
  );
}