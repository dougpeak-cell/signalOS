import type { ReactElement, ReactNode } from "react";

export const heroPanelClass =
  "rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.16),_rgba(2,6,23,0.94)_55%)] shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_18px_50px_rgba(0,0,0,0.45)]";

export const panelClass =
  "rounded-2xl border border-cyan-500/20 bg-slate-950/88 shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_10px_30px_rgba(0,0,0,0.35)]";

export const compactPanelClass =
  "rounded-2xl border border-cyan-500/15 bg-slate-950/78 shadow-[0_8px_22px_rgba(0,0,0,0.28)]";

export const todayPageStackClass = "flex flex-col gap-6";

export const majorSectionClass = `${panelClass} p-5`;

export const supportSectionClass = `${compactPanelClass} p-4`;

export const rowListItemClass = "px-4 py-3";

export const internalCardStackClass = "space-y-3";

export const multiCardRowClass = "grid gap-4";

type SectionHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  titleHref?: string | null;
  titleClassName?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  titleHref,
  titleClassName,
}: SectionHeaderProps): ReactElement {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          {eyebrow}
        </div>
        {titleHref ? (
          <a
            href={titleHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition hover:text-cyan-200"
          >
            <h2 className={titleClassName ?? "text-xl font-semibold tracking-tight text-white"}>
              {title}
            </h2>
          </a>
        ) : (
          <h2 className={titleClassName ?? "text-xl font-semibold tracking-tight text-white"}>
            {title}
          </h2>
        )}
        {subtitle ? (
          <p className="mt-1 text-sm text-white/55">{subtitle}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}