import {
	clamp,
	round,
} from "../math";

import type {
	AMSAFutureEvidence,
	AMSAFutureProbabilityBreakdown,
} from "../types";

/* =========================================================
	 FUTUREMAP(TM) PROBABILITY ENGINE

	 Important:
	 These are model-relative scenario probabilities.
	 They are not statistically calibrated market guarantees.

	 The model converts directional evidence into:
	 - Bull probability
	 - Base probability
	 - Bear probability

	 All three probabilities always total 100.
========================================================= */

export function calculateFutureProbabilities(
	evidence: AMSAFutureEvidence[],
): AMSAFutureProbabilityBreakdown {
	const usableEvidence = evidence.filter(
		(item) =>
			Number.isFinite(item.impact) &&
			Number.isFinite(item.confidence),
	);

	if (!usableEvidence.length) {
		return {
			bullRaw: 25,
			baseRaw: 50,
			bearRaw: 25,

			bullNormalized: 25,
			baseNormalized: 50,
			bearNormalized: 25,

			directionalScore: 0,
			uncertaintyScore: 100,
			conflictScore: 0,
		};
	}

	let bullishEnergy = 0;
	let bearishEnergy = 0;
	let neutralEnergy = 0;

	let bullishCount = 0;
	let bearishCount = 0;

	let totalReliability = 0;

	for (const item of usableEvidence) {
		const reliability =
			clamp(item.confidence) / 100;

		const strength =
			Math.abs(item.impact) *
			reliability;

		totalReliability += reliability;

		if (item.impact > 8) {
			bullishEnergy += strength;
			bullishCount += 1;
		} else if (item.impact < -8) {
			bearishEnergy += strength;
			bearishCount += 1;
		} else {
			neutralEnergy +=
				Math.max(8, 22 - strength);
		}
	}

	const totalDirectionalEnergy =
		bullishEnergy + bearishEnergy;

	const directionalScore =
		totalDirectionalEnergy > 0
			? (
					bullishEnergy -
					bearishEnergy
				) /
				totalDirectionalEnergy *
				100
			: 0;

	const conflictScore =
		calculateConflictScore(
			bullishEnergy,
			bearishEnergy,
			bullishCount,
			bearishCount,
		);

	const averageReliability =
		totalReliability /
		usableEvidence.length;

	const coverageScore = clamp(
		usableEvidence.length / 14 * 100,
	);

	const uncertaintyScore = clamp(
		100 -
			averageReliability * 62 -
			coverageScore * 0.25 +
			conflictScore * 0.45,
	);

	/*
	 * Bull and bear begin with equal base energy.
	 * Base receives additional probability when:
	 * - evidence is uncertain,
	 * - bullish and bearish evidence conflict,
	 * - directional evidence is weak.
	 */

	const bullRaw = clamp(
		22 +
			bullishEnergy * 0.5 -
			bearishEnergy * 0.12 -
			uncertaintyScore * 0.08,
		4,
		90,
	);

	const bearRaw = clamp(
		22 +
			bearishEnergy * 0.5 -
			bullishEnergy * 0.12 -
			uncertaintyScore * 0.08,
		4,
		90,
	);

	const directionalConviction = clamp(
		Math.abs(directionalScore),
	);

	const baseRaw = clamp(
		34 +
			uncertaintyScore * 0.42 +
			conflictScore * 0.34 +
			neutralEnergy * 0.08 -
			directionalConviction * 0.28,
		8,
		86,
	);

	const normalized = normalizeProbabilities(
		bullRaw,
		baseRaw,
		bearRaw,
	);

	return {
		bullRaw: round(bullRaw),
		baseRaw: round(baseRaw),
		bearRaw: round(bearRaw),

		bullNormalized: normalized.bull,
		baseNormalized: normalized.base,
		bearNormalized: normalized.bear,

		directionalScore: round(directionalScore),
		uncertaintyScore: round(uncertaintyScore),
		conflictScore: round(conflictScore),
	};
}

function calculateConflictScore(
	bullishEnergy: number,
	bearishEnergy: number,
	bullishCount: number,
	bearishCount: number,
): number {
	if (
		bullishEnergy <= 0 ||
		bearishEnergy <= 0
	) {
		return 0;
	}

	const energyBalance =
		Math.min(
			bullishEnergy,
			bearishEnergy,
		) /
		Math.max(
			bullishEnergy,
			bearishEnergy,
		);

	const countBalance =
		Math.min(
			bullishCount,
			bearishCount,
		) /
		Math.max(
			bullishCount,
			bearishCount,
			1,
		);

	return clamp(
		energyBalance * 72 +
			countBalance * 28,
	);
}

function normalizeProbabilities(
	bull: number,
	base: number,
	bear: number,
): {
	bull: number;
	base: number;
	bear: number;
} {
	const total =
		bull + base + bear;

	if (total <= 0) {
		return {
			bull: 25,
			base: 50,
			bear: 25,
		};
	}

	const bullNormalized =
		bull / total * 100;

	const baseNormalized =
		base / total * 100;

	const roundedBull =
		Math.round(bullNormalized);

	const roundedBase =
		Math.round(baseNormalized);

	const roundedBear =
		100 -
		roundedBull -
		roundedBase;

	return {
		bull: clamp(
			roundedBull,
			0,
			100,
		),

		base: clamp(
			roundedBase,
			0,
			100,
		),

		bear: clamp(
			roundedBear,
			0,
			100,
		),
	};
}