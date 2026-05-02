export default function SigiSignalIcon({
  size = 56,
  pulse = true,
}: {
  size?: number;
  pulse?: boolean;
}) {
  return (
    <div
      className="relative flex items-center justify-center transition group-hover:scale-105"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full border border-cyan-400/30" />

      <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-md" />

      {pulse ? (
        <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20 opacity-20" />
      ) : null}

      <div className="relative flex h-[70%] w-[70%] items-center justify-center rounded-full bg-cyan-400/20 shadow-[0_0_28px_rgba(34,211,238,0.75)]">
        <svg
          viewBox="0 0 100 100"
          className="h-[65%] w-[65%] text-cyan-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 50 L25 50 L35 30 L50 70 L65 40 L75 50 L95 50" />
        </svg>
      </div>
    </div>
  );
}