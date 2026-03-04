"use client";

import { useState } from "react";

export default function AdminLinesClient() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function pullNow() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/pull-lines", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`❌ ${json?.error ?? res.statusText}`);
      } else {
        setMsg(
          `✅ Pulled lines: ${json?.inserted ?? 0} inserted, ${json?.updated ?? 0} updated`
        );
      }
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Request failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-black text-lg">Sportsbook Lines</div>
          <div className="text-sm text-gray-500">
            Pull latest lines right now (no cron needed).
          </div>
        </div>

        <button
          onClick={pullNow}
          disabled={loading}
          className={[
            "rounded-xl px-4 py-2 font-extrabold",
            "border border-gray-200",
            loading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50",
          ].join(" ")}
        >
          {loading ? "Pulling…" : "Pull Lines Now"}
        </button>
      </div>

      {msg ? <div className="mt-3 text-sm">{msg}</div> : null}
    </div>
  );
}