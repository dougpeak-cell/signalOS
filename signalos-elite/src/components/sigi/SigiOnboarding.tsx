"use client";

import { useEffect, useState } from "react";

import {
  getSigiProfile,
  saveSigiProfile,
  SIGI_INTEREST_OPTIONS,
  type SigiProfile,
} from "@/lib/sigi/sigiProfile";

export default function SigiOnboarding({
  onComplete,
  initialProfile,
  mode = "setup",
}: {
  onComplete?: (profile: SigiProfile) => void;
  initialProfile?: SigiProfile | null;
  mode?: "setup" | "interests";
}) {
  const [completedProfile, setCompletedProfile] = useState<SigiProfile | null>(null);
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const isInterestEditor = mode === "interests";
  const [setupStep, setSetupStep] = useState<"name" | "interests">(
    isInterestEditor ? "interests" : "name"
  );

  useEffect(() => {
    const saved = initialProfile ?? getSigiProfile();

    setSetupStep(isInterestEditor ? "interests" : "name");

    if (saved) {
      setName(saved.name ?? "");
      setInterests(saved.interests ?? []);
    }

    if (saved && !initialProfile && !isInterestEditor) {
      setCompletedProfile(saved);
      return;
    }
  }, [initialProfile, isInterestEditor]);

  if (completedProfile && !isInterestEditor && !initialProfile) return null;

  function toggleInterest(value: string) {
    setInterests((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function saveNameProfile() {
    const trimmedName = name.trim();

    if (!trimmedName) return null;

    return {
      name: trimmedName,
      interests,
    };
  }

  function continueToInterests() {
    const nextProfile = saveNameProfile();
    if (!nextProfile) return;

    setName(nextProfile.name);
    setInterests(nextProfile.interests ?? []);
    setSetupStep("interests");
  }

  function finish() {
    const trimmedName = name.trim();

    const nextProfile = isInterestEditor
      ? (() => {
          const currentProfile = initialProfile ?? getSigiProfile();
          const next: SigiProfile = {
            name: currentProfile?.name?.trim() || trimmedName,
            interests,
          };

          if (!next.name) return null;

          saveSigiProfile(next);
          return next;
        })()
      : trimmedName
        ? (() => {
            const profile = saveNameProfile();
            if (!profile) return null;
            saveSigiProfile(profile);
            return profile;
          })()
        : null;

    if (!nextProfile) return;

    setCompletedProfile(nextProfile);
    onComplete?.(nextProfile);
  }

  return (
    <section className="rounded-3xl border border-cyan-400/25 bg-cyan-400/4.5 p-4 shadow-[0_0_44px_rgba(34,211,238,0.08)] sm:p-5">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
        SIGI Welcome
      </div>

      {!isInterestEditor && setupStep === "name" ? (
        <>
          <h2 className="mt-2 text-[1.7rem] leading-[0.98] font-black text-white sm:text-[1.9rem] sm:leading-none">
            What&apos;s your name?
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            I&apos;ll use it to make your answers feel personal.
          </p>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name..."
            className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
          />

          <button
            type="button"
            onClick={continueToInterests}
            disabled={!name.trim()}
            className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100"
          >
            Continue
          </button>
        </>
      ) : null}

      {isInterestEditor || setupStep === "interests" ? (
        <>
          <h2 className="mt-2 text-[1.85rem] leading-[0.95] font-black text-white sm:text-2xl sm:leading-none">
            {isInterestEditor
              ? `Update sectors for ${name.trim() || "your profile"}.`
              : `Hi ${name.trim() || "there"}, help me know your interests.`}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {isInterestEditor
              ? "Pick the markets or sectors you want Sigi to prioritize."
              : "Select the sectors you are interested in and press save."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {SIGI_INTEREST_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleInterest(option)}
                className={`rounded-2xl border px-3.5 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  interests.includes(option)
                    ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                    : "border-white/10 bg-white/5 text-white/65 hover:border-cyan-300/30 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={finish}
            className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100"
          >
            {isInterestEditor ? "Save interests" : "Save"}
          </button>
        </>
      ) : null}
    </section>
  );
}