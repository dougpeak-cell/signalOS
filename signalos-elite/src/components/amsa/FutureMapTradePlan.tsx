import type { ReactNode } from "react";

import type {
  AMSAFutureMap,
} from "@/lib/amsa";

type Props = {
  futureMap: AMSAFutureMap;
};

export default function FutureMapTradePlan({
  futureMap,
}: Props) {
  const plan =
    futureMap.tradePlan;

  const primary =
    futureMap[
      futureMap.primaryScenario
    ];

  if (!plan) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950 p-5">
        <p className="text-sm text-slate-400">
          A trade plan is unavailable because current price data is missing.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(3,13,27,0.98),rgba(2,6,18,0.98))]">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-300">
              FutureMap(TM) Trade Plan
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              {futureMap.symbol}
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {futureMap.bias} ·{" "}
              {futureMap.horizon} horizon
            </p>
          </div>

          <div className="text-right">
            <p className="text-4xl font-bold text-cyan-200">
              {primary.probability}%
            </p>

            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
              {futureMap.primaryScenario} probability
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Current"
          value={formatPrice(
            plan.currentPrice,
          )}
        />

        <Metric
          label="Target One"
          value={formatPrice(
            plan.targetOne,
          )}
        />

        <Metric
          label="Invalidation"
          value={formatPrice(
            plan.invalidationPrice,
          )}
        />

        <Metric
          label="Reward / Risk"
          value={
            plan.rewardToRisk ===
            null
              ? "—"
              : `${plan.rewardToRisk}:1`
          }
        />
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <BlockLabel>
            Scenario Levels
          </BlockLabel>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <LevelCard
              label="Entry Zone"
              value={
                plan.entryZoneLow !==
                  null &&
                plan.entryZoneHigh !==
                  null
                  ? `${formatPrice(
                      plan.entryZoneLow,
                    )} – ${formatPrice(
                      plan.entryZoneHigh,
                    )}`
                  : "—"
              }
            />

            <LevelCard
              label="Target Two"
              value={formatPrice(
                plan.targetTwo,
              )}
            />

            <LevelCard
              label="Expected Move"
              value={
                plan.expectedMovePercent ===
                null
                  ? "—"
                  : `${plan.expectedMovePercent}%`
              }
            />

            <LevelCard
              label="Stop Distance"
              value={
                plan.stopDistancePercent ===
                null
                  ? "—"
                  : `${plan.stopDistancePercent}%`
              }
            />
          </div>

          <div className="mt-5">
            <BlockLabel>
              Scenario Conditions
            </BlockLabel>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              {plan.conditions.map(
                (condition) => (
                  <p
                    key={condition}
                    className="mt-2 text-sm leading-6 text-slate-300 first:mt-0"
                  >
                    <span className="mr-2 text-cyan-300">
                      •
                    </span>
                    {condition}
                  </p>
                ),
              )}
            </div>
          </div>
        </div>

        <div>
          <BlockLabel>
            Model Quality
          </BlockLabel>

          <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.035] p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-bold text-white">
                  {plan.qualityLabel}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Scenario quality
                </p>
              </div>

              <p className="text-4xl font-bold text-cyan-200">
                {plan.qualityScore ??
                  "—"}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <SmallMetric
                label="Confidence"
                value={`${plan.confidence}%`}
              />

              <SmallMetric
                label="Risk"
                value={
                  plan.riskLevel
                }
              />

              <SmallMetric
                label="Expected Value"
                value={
                  plan.expectedValuePercent ===
                  null
                    ? "—"
                    : `${
                        plan.expectedValuePercent >
                        0
                          ? "+"
                          : ""
                      }${plan.expectedValuePercent}%`
                }
              />

              <SmallMetric
                label="Grade"
                value={
                  futureMap.grade
                }
              />
            </div>
          </div>

          {plan.warnings.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-500/[0.035] p-4">
              <BlockLabel>
                Risk Notes
              </BlockLabel>

              {plan.warnings.map(
                (warning) => (
                  <p
                    key={warning}
                    className="mt-2 text-xs leading-5 text-slate-400"
                  >
                    • {warning}
                  </p>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-4 sm:px-6">
        <p className="text-[11px] leading-5 text-slate-600">
          {plan.positionRiskNotice}
        </p>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-950 p-4 sm:p-5">
      <p className="text-xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function LevelCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-lg font-semibold text-white">
        {value}
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="font-semibold text-white">
        {value}
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function BlockLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
      {children}
    </p>
  );
}

function formatPrice(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  if (value >= 1000) {
    return `$${value.toFixed(1)}`;
  }

  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }

  return `$${value.toFixed(4)}`;
}