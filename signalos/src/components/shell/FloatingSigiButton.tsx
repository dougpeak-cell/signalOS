"use client";

type FloatingSigiButtonProps = {
  onClick: () => void;
  label?: string;
  pulse?: boolean;
};

export default function FloatingSigiButton({
  onClick,
  label = "Ask Sigi",
  pulse = true,
}: FloatingSigiButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-4 z-90 xl:hidden"
      aria-label={label}
    >
      <div
        className={`group flex items-center gap-2 rounded-full border border-cyan-400/25 bg-black/80 px-4 py-3 shadow-[0_0_24px_rgba(34,211,238,0.18)] backdrop-blur-md transition hover:border-cyan-300/45 hover:bg-cyan-400/10 ${
          pulse ? "sig-pulse" : ""
        }`}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/12 text-sm font-bold text-cyan-300">
          ✦
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200 group-hover:text-white">
          {label}
        </div>
      </div>
    </button>
  );
}
