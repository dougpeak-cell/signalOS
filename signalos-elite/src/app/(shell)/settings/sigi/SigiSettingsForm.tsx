"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SigiUserSettingsView } from "@/lib/sigi/settings";

type Props = {
  settings: SigiUserSettingsView;
};

export default function SigiSettingsForm({ settings }: Props) {
  const router = useRouter();
  const [providerLabel, setProviderLabel] = useState(settings.provider);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [model, setModel] = useState(settings.model);
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(settings.isEnabled);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [lastTestPassed, setLastTestPassed] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    ok: boolean;
    message?: string;
    error?: string;
    details?: string;
  }>(null);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disableSuccess, setDisableSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const disabled = !settings.canManage || isPending;
  const byokPlanEligible = settings.hasSmartFeatures;
  const currentTierLabel =
    settings.currentTier.charAt(0).toUpperCase() + settings.currentTier.slice(1);
  const providerStatusLabel = enabled
    ? `Using your provider: ${model}`
    : `Using Sigi AI (${currentTierLabel})`;

  useEffect(() => {
    setTestResult(null);
    setLastTestPassed(false);
  }, [baseUrl, model, apiKey, providerLabel]);

  async function testProvider() {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/sigi/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: providerLabel,
          baseUrl,
          model,
          apiKey,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        details?: string;
        message?: string;
        reply?: string;
      };

      setLastTestPassed(!!data.ok);

      setTestResult({
        ok: !!data.ok,
        message: data.ok ? "Provider connected successfully" : undefined,
        error: data.ok ? undefined : "Provider test failed",
        details: data.ok
          ? "Your optional personal provider is reachable and ready to use."
          : "Sigi can still use its default AI if your personal provider is unavailable.",
      });
    } catch (error) {
      setLastTestPassed(false);
      setTestResult({
        ok: false,
        error: "Provider test failed",
        details: "Sigi can still use its default AI if your personal provider is unavailable.",
      });
    } finally {
      setIsTesting(false);
    }
  }

  async function saveSettings() {
    if (enabled && testResult && !testResult.ok) {
      const confirmed = window.confirm(
        "Your most recent provider connection test failed. Save anyway?"
      );
      if (!confirmed) return;
    }

    if (enabled && !lastTestPassed) {
      const confirmed = window.confirm(
        "Your provider has not passed a connection test yet. Save anyway?"
      );
      if (!confirmed) return;
    }

    setIsPending(true);
    setSaveError(null);
    setSaveSuccess(null);
    setDisableError(null);
    setDisableSuccess(null);

    try {
      const res = await fetch("/api/sigi/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          baseUrl,
          model,
          label: providerLabel,
          apiKey,
        }),
      });

      const data = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok) {
        throw new Error(data.error || "Unable to save Sigi settings.");
      }

      setApiKey("");
      setSaveSuccess("Sigi AI settings saved.");
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save Sigi settings.");
    } finally {
      setIsPending(false);
    }
  }

  async function disableSettings() {
    setIsDisabling(true);
    setSaveError(null);
    setSaveSuccess(null);
    setDisableError(null);
    setDisableSuccess(null);

    try {
      const res = await fetch("/api/sigi/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: false,
          baseUrl,
          model,
          label: providerLabel,
          apiKey: "",
        }),
      });

      const data = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok) {
        throw new Error(data.error || "Unable to disable Sigi settings.");
      }

      setEnabled(false);
      setApiKey("");
      setDisableSuccess("Sigi AI settings disabled.");
      router.refresh();
    } catch (error) {
      setDisableError(error instanceof Error ? error.message : "Unable to disable Sigi settings.");
    } finally {
      setIsDisabling(false);
    }
  }

  async function openBillingPortal() {
    setIsOpeningBilling(true);
    setBillingError(null);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = (await res.json()) as { error?: string; url?: string };

      if (!res.ok) {
        throw new Error(data.error || "Unable to open billing portal");
      }

      if (!data.url) {
        throw new Error("Unable to open billing portal");
      }

      window.location.href = data.url;
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to open billing portal");
    } finally {
      setIsOpeningBilling(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.98),rgba(5,9,17,0.98))] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_18px_42px_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-cyan-400/16 bg-cyan-400/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/88">
            {settings.hostedAiStatus}
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
            {providerStatusLabel}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              AI status
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {settings.hostedAiStatus}
            </div>
            <p className="mt-2 text-sm leading-6 text-white/62">
              {settings.hostedAiSubtext}
            </p>
          </div>

          <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              Advanced Settings
            </div>
            <div className="mt-3 grid gap-2 text-sm text-white/68">
              <div>
                {byokPlanEligible
                  ? "Use your own provider (optional)."
                  : "Custom provider access is available on Smart and Pro."}
              </div>
              <div>Server timeout stays capped at 15 seconds.</div>
              <div>Allowed models: {settings.allowedModels.join(", ")}.</div>
              <div>Per-user request cap: {settings.requestLimitPerMinute} per minute.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.98),rgba(5,9,17,0.98))] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_18px_42px_rgba(0,0,0,0.24)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          Billing
        </div>
        <div className="mt-2 text-2xl font-semibold text-white">Manage your Sigi plan</div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
          Upgrade, downgrade, or manage your subscription securely through our billing partner.
          You can update your payment method, view invoices, or cancel anytime.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void openBillingPortal()}
            disabled={!settings.isSignedIn || isOpeningBilling}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/82 transition hover:border-white/18 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isOpeningBilling ? "Opening billing" : "Manage billing"}
          </button>
        </div>

        <div className="mt-3 text-xs text-white/50">Powered by Stripe. Secure and encrypted.</div>
        <div className="mt-1 text-sm text-white/62">Changes take effect immediately. No hidden fees.</div>
      </div>

      {billingError ? (
        <div className="rounded-3xl border border-rose-400/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {billingError}
        </div>
      ) : null}

      {settings.message ? (
        <div className="rounded-3xl border border-amber-300/18 bg-amber-300/8 px-4 py-3 text-sm text-amber-50/88">
          {settings.message}
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-3xl border border-rose-400/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {saveError}
        </div>
      ) : null}

      {saveSuccess ? (
        <div className="rounded-3xl border border-emerald-400/18 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {saveSuccess}
        </div>
      ) : null}

      {disableError ? (
        <div className="rounded-3xl border border-rose-400/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {disableError}
        </div>
      ) : null}

      {disableSuccess ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78">
          {disableSuccess}
        </div>
      ) : null}

      {byokPlanEligible ? (
        <>
          <form
            className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,21,0.98),rgba(5,9,16,0.98))] p-5"
          >
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                Advanced Settings
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                Use your own provider (optional)
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">
                Most users should ignore this section. Sigi AI already works with zero setup. This is only for technical power users who want to route Sigi through their own OpenAI-compatible provider.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-white/72">
                <span>Provider label</span>
                <input
                  name="provider"
                  value={providerLabel}
                  onChange={(event) => setProviderLabel(event.target.value)}
                  disabled={disabled}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-300/30"
                />
              </label>

              <label className="grid gap-2 text-sm text-white/72">
                <span>Base URL</span>
                <input
                  name="baseUrl"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  disabled={disabled}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-300/30"
                />
              </label>

              <label className="grid gap-2 text-sm text-white/72">
                <span>Model</span>
                <select
                  name="model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={disabled}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-300/30"
                >
                  {settings.allowedModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-white/72">
                <span>API key</span>
                <input
                  name="apiKey"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={settings.apiKeyConfigured ? "Leave blank to keep current key" : "sk-..."}
                  disabled={disabled}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-300/30"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm text-white/72">
              <input
                type="checkbox"
                name="isEnabled"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-300"
              />
              Enable my optional personal provider for /api/sigi requests.
            </label>

            {enabled && !lastTestPassed && !testResult ? (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-100">
                Your provider has not passed a connection test yet. Test it before saving to reduce the chance of broken BYOK settings.
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void testProvider()}
                disabled={disabled || isTesting || !baseUrl.trim() || !model.trim() || !apiKey.trim()}
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 disabled:opacity-50"
              >
                {isTesting ? "Testing..." : "Test provider"}
              </button>
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={disabled}
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Advanced Settings"}
              </button>
            </div>

            {testResult ? (
              <div
                className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                  testResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                }`}
              >
                <div className="font-medium">
                  {testResult.ok
                    ? testResult.message ?? "Provider connected."
                    : testResult.error ?? "Provider test failed."}
                </div>

                {testResult.details ? (
                  <div className="mt-1 text-xs opacity-80">{testResult.details}</div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 text-xs text-white/50">
              Test uses the current base URL, model, and typed API key only. Nothing is saved until you choose Save Advanced Settings.
            </div>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void disableSettings();
            }}
          >
            <button
              type="submit"
              disabled={!settings.canManage || isDisabling}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/82 transition hover:border-white/18 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDisabling ? "Disabling" : "Disable optional personal provider"}
            </button>
          </form>
        </>
      ) : (
        <section className="rounded-[28px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(24,18,9,0.96),rgba(13,10,5,0.98))] p-5 shadow-[0_0_0_1px_rgba(250,204,21,0.06),0_18px_42px_rgba(0,0,0,0.24)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/72">
            Smart / Pro feature
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            Bring your own brain into Sigi&apos;s body
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/66">
            Custom provider routing is reserved for Sigi Smart and Pro. Free users get instant hosted Sigi with no setup. Upgrade when you want to plug your own model into the same Sigi experience.
          </p>
        </section>
      )}
    </div>
  );
}