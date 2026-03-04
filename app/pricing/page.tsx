import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="underline">
          ← Back
        </Link>
        <div className="text-sm text-slate-500">CampusKings</div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Go Pro</h1>
        <p className="text-slate-600">
          Unlock Value Score, Reasons, Top Locks, and premium sorting.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-5 bg-white">
          <div className="text-sm text-slate-500">Free</div>
          <div className="text-2xl font-bold mt-1">$0</div>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>✅ Player predictions (PTS/REB/AST)</li>
            <li>✅ Basic confidence lock %</li>
            <li>✅ Today’s games</li>
          </ul>
          <div className="mt-5">
            <Link href="/login" className="rounded-lg border px-3 py-2 text-sm inline-block">
              Log in
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border p-5 bg-black text-white">
          <div className="text-sm text-white/70">Pro</div>
          <div className="text-2xl font-bold mt-1">$9.99/mo</div>
          <div className="text-sm text-white/70 mt-1">Cancel anytime</div>
          <ul className="mt-4 space-y-2 text-sm">
            <li>⭐ Value Score (gradient)</li>
            <li>🔥 Reasons (“High confidence”, “Strong rebounder”, etc.)</li>
            <li>🏅 Top player per team + TopLocks</li>
            <li>↕ Sort by Value / Projection / Confidence</li>
          </ul>
          <div className="mt-5 flex gap-2">
            <Link
              href="/pro/dev"
              className="rounded-lg bg-white text-black px-3 py-2 text-sm inline-block"
            >
              Upgrade (Dev)
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/30 px-3 py-2 text-sm inline-block"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Dev mode upgrade toggles your account to Pro for testing.
      </div>
    </div>
  );
}
