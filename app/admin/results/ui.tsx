"use client";

import { useState } from "react";

export default function AdminBackfillButton() {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<any>(null);

  async function run() {
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch("/api/admin/backfill-results", { method: "POST" });
      const json = await res.json();
      setOut(json);
    } catch (e: any) {
      setOut({ ok: false, error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {busy ? "Running…" : "Run backfill now"}
      </button>

      {out ? (
        <pre className="rounded-xl border bg-slate-50 p-3 text-xs overflow-auto max-h-[400px]">
          {JSON.stringify(out, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
