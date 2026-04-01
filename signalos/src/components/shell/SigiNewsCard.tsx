"use client";

type SigiNewsItem = {
  id: string;
  headline: string;
  takeaway: string;
  tone?: "bullish" | "bearish" | "neutral";
  source?: string;
  href?: string;
};

type SigiNewsCardProps = {
  items: SigiNewsItem[];
};

function toneClasses(tone: "bullish" | "bearish" | "neutral" = "neutral") {
  if (tone === "bullish") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (tone === "bearish") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  }

  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
}

export default function SigiNewsCard({ items }: SigiNewsCardProps) {
  return (
    <section className="glow-panel rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
            Related News
          </div>
          <div className="mt-1 text-xs text-white/45">
            AI-filtered stock context
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
          {items.length}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="sig-card-soft rounded-2xl p-4 text-sm text-white/55">
            No related headlines yet.
          </div>
        ) : (
          items.map((item) => {
            const content = (
              <div className="sig-card-soft rounded-2xl p-4 transition hover:border-white/15 hover:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-6 text-white">
                      {item.headline}
                    </div>

                    <div className="mt-2 text-sm leading-6 text-white/62">
                      {item.takeaway}
                    </div>
                  </div>

                  <div
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClasses(
                      item.tone ?? "neutral"
                    )}`}
                  >
                    {item.tone ?? "neutral"}
                  </div>
                </div>

                {item.source ? (
                  <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    {item.source}
                  </div>
                ) : null}
              </div>
            );

            if (item.href) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  {content}
                </a>
              );
            }

            return <div key={item.id}>{content}</div>;
          })
        )}
      </div>
    </section>
  );
}
