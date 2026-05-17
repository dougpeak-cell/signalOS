import type { ReactNode } from "react";

type PageHeaderBlockProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  panelOverlay?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export default function PageHeaderBlock({
  title,
  description,
  eyebrow = "SigiOS",
  actions,
  children,
  aside,
  panelOverlay,
  className,
  titleClassName,
  descriptionClassName,
}: PageHeaderBlockProps) {
  return (
    <section
      className={classes(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-b from-white/6 to-white/3 px-4 py-4 md:p-6",
        className
      )}
    >
      {panelOverlay}

      <div
        className={classes(
          "relative",
          aside ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start" : undefined
        )}
      >
        <div className="min-w-0">
          <div className="space-y-2">
            {eyebrow ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                {eyebrow}
              </div>
            ) : null}

            <h1
              className={classes(
                "text-3xl font-semibold tracking-tight text-white md:text-[36px]",
                titleClassName
              )}
            >
              {title}
            </h1>

            {description ? (
              <p
                className={classes(
                  "max-w-3xl text-sm leading-6 text-white/65 md:text-[15px]",
                  descriptionClassName
                )}
              >
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}

          {children ? <div className="mt-4">{children}</div> : null}
        </div>

        {aside ? <div className="min-w-0 self-start">{aside}</div> : null}
      </div>
    </section>
  );
}