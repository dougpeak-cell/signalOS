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
  const pupilGradientId = `sigiPupilGradient-${iconId}`;

  return (
    <svg
      viewBox="0 0 260 150"
      className={className}
      role="img"
      aria-label="SigiOS scanning eye logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
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

        <linearGradient id={pupilGradientId} x1="0" x2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="45%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      <style>{`
        .sigi-logo-pupil-${iconId} {
          transform-origin: 130px 75px;
          animation: ${animate ? `sigiLogoScan-${iconId} 4.2s ease-in-out infinite` : "none"};
        }

        .sigi-logo-aura-${iconId} {
          transform-origin: 130px 75px;
          animation: ${animate ? `sigiLogoBreath-${iconId} 3.4s ease-in-out infinite` : "none"};
        }

        .sigi-logo-shell-${iconId} {
          animation: ${animate ? `sigiShellGlow-${iconId} 3.4s ease-in-out infinite` : "none"};
        }

        @keyframes sigiLogoScan-${iconId} {
          0%, 100% { transform: translateX(0px); }
          22% { transform: translateX(-12px); }
          44% { transform: translateX(0px); }
          68% { transform: translateX(12px); }
          88% { transform: translateX(0px); }
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
          .sigi-logo-pupil-${iconId},
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

      <g className={`sigi-logo-pupil-${iconId}`}>
        <ellipse
          cx="130"
          cy="75"
          rx="18"
          ry="47"
          fill={`url(#${pupilGradientId})`}
          stroke="#f0abfc"
          strokeWidth="3"
          filter={`url(#${glowFilterId})`}
        />
        <ellipse cx="124" cy="60" rx="5" ry="20" fill="#ffffff" opacity="0.42" />
        <ellipse cx="137" cy="83" rx="3" ry="28" fill="#020617" opacity="0.22" />
      </g>
    </svg>
  );
}