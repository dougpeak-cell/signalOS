import Link from "next/link";
import { ReactNode } from "react";

export type FeaturedMacroWorkflowCard = {
  title: string;
  eyebrow: ReactNode;
  summary: ReactNode;
  detail: ReactNode;
  href: string;
  cta: string;
};

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="sig-card rounded-[28px]">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-2 text-sm text-white/55">{subtitle}</div>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function FeaturedMacroSection({
  cards,
}: {
  cards: FeaturedMacroWorkflowCard[];
}) {
  return (
    <SectionCard
      title="Featured Macro"
      subtitle="Macro context, best setup, and next-step risk review."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card, index) => (
          <div
            key={card.title}
            id={index === 1 ? "opportunity-panel" : "risk-dashboard"}
            className="rounded-3xl border border-white/10 bg-black/25 p-5"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
              {card.eyebrow}
            </div>
            <div className="mt-3 text-lg font-semibold text-white">
              {card.title}
            </div>
            <div className="mt-3 text-sm leading-6 text-white/72">
              {card.summary}
            </div>
            <div className="mt-3 text-sm leading-6 text-white/48">
              {card.detail}
            </div>
            <div className="mt-5">
              <Link
                href={card.href}
                className="inline-flex rounded-2xl border border-cyan-400/22 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/38 hover:bg-cyan-400/16 hover:text-cyan-100"
              >
                {card.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
