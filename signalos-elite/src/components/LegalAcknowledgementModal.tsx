"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LegalAcknowledgementModal() {
  const [show, setShow] = useState(false);
  const [risk, setRisk] = useState(false);
  const [terms, setTerms] = useState(false);
  const [ai, setAi] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("sigiosLegalAccepted");
    if (!accepted) setShow(true);
  }, []);

  if (!show) return null;

  const canContinue = risk && terms && ai;

  function accept() {
    localStorage.setItem("sigiosLegalAccepted", new Date().toISOString());
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-4xl border border-cyan-400/20 bg-[#071018]/95 p-6 text-white shadow-[0_0_50px_rgba(34,211,238,0.12)] md:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
          Welcome to SigiOS
        </div>

        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Before you continue</h2>

        <p className="mt-4 text-sm leading-6 text-white/72">
          Please acknowledge that SigiOS provides educational and informational
          content only.
        </p>

        <div className="mt-6 grid gap-4 text-sm leading-6 text-white/74">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={risk}
              onChange={(event) => setRisk(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-300"
            />
            <span>
              I understand investing and trading involve risk, including
              possible loss of principal.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-300"
            />
            <span>
              I agree to the{" "}
              <Link href="/legal/terms-of-use" className="text-cyan-200 underline-offset-4 hover:underline">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy-policy" className="text-cyan-200 underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={ai}
              onChange={(event) => setAi(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-300"
            />
            <span>
              I understand Sigi AI may generate inaccurate or incomplete
              information and should not be relied on as investment advice.
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={accept}
          disabled={!canContinue}
          className="mt-6 inline-flex w-full justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue to SigiOS
        </button>
      </div>
    </div>
  );
}