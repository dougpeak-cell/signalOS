"use client";

import Link from "next/link";
import { useState } from "react";

export function UpgradeAgreement({
  onUpgrade,
  busy = false,
}: {
  onUpgrade: () => void;
  busy?: boolean;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-4">
      <label className="flex items-start gap-3 text-sm leading-6 text-white/72">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-300"
        />

        <span>
          I have read and agree to the{" "}
          <Link href="/legal/terms-of-use" className="text-cyan-200 underline-offset-4 hover:underline">
            Terms of Use
          </Link>
          ,{" "}
          <Link href="/legal/privacy-policy" className="text-cyan-200 underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          ,{" "}
          <Link
            href="/legal/financial-disclosure"
            className="text-cyan-200 underline-offset-4 hover:underline"
          >
            Financial Disclosure
          </Link>
          , and{" "}
          <Link href="/legal/ai-disclosure" className="text-cyan-200 underline-offset-4 hover:underline">
            AI Disclosure
          </Link>
          .
        </span>
      </label>

      <button
        type="button"
        onClick={onUpgrade}
        disabled={!agreed || busy}
        className="mt-4 inline-flex w-full justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Starting checkout" : "Continue to Secure Checkout"}
      </button>
    </div>
  );
}