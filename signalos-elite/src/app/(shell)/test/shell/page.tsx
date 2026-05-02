import Link from "next/link";

export default function ShellRailTestPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
      <section className="rounded-4xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_48%),rgba(255,255,255,0.03)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-200/72">
          Automation Surface
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Desktop Shell Rail Test
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
          This route forces the desktop shell rail to render in-flow so browser
          automation can interact with the Sigi assistant rail without relying
          on the integrated browser pane crossing the xl breakpoint.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              Primary Target
            </div>
            <div className="mt-2 text-base font-semibold text-white">
              Use this page when you need a stable selector for the Sigi rail.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              Route-aware Variant
            </div>
            <div className="mt-2 text-base font-semibold text-white">
              <Link className="text-cyan-200 underline-offset-4 hover:underline" href="/?shell=desktop">
                Open the home page with desktop shell forced on
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}