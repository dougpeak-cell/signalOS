import {
	clamp,
	isFiniteNumber,
	round,
} from "../math";

import {
	buildFutureEvidence,
} from "./evidence";

import {
	calculateFutureProbabilities,
} from "./probability";

import {
	calculateFutureMapConfidence,
} from "./confidence";

import {
	createFutureMapTradePlan,
} from "./tradePlan";

import {
	generateFutureScenarios,
} from "./scenarios";

import type {
	AMSAFutureMap,
	AMSAFutureMapBias,
	AMSAFutureMapGrade,
	AMSAFutureMapInput,
	AMSAFutureMapRiskLevel,
	AMSAFutureScenarioType,
} from "../types";

/* =========================================================
	 FUTUREMAP(TM) CORE ENGINE
========================================================= */

export function calculateFutureMap(
	rawInput: AMSAFutureMapInput,
): AMSAFutureMap {
	const input = normalizeInput(
		rawInput,
	);

	const {
		evidence,
		missingInputs,
	} = buildFutureEvidence(input);

	const probabilityBreakdown =
		calculateFutureProbabilities(
			evidence,
		);

	const confidence =
		calculateFutureMapConfidence({
			input,
			evidence,
			probabilities:
				probabilityBreakdown,
		});

	const scenarios =
		generateFutureScenarios({
			input,

			bullProbability:
				probabilityBreakdown
					.bullNormalized,

			baseProbability:
				probabilityBreakdown
					.baseNormalized,

			bearProbability:
				probabilityBreakdown
					.bearNormalized,

			confidence,
			evidence,
		});

	const primaryScenario =
		determinePrimaryScenario(
			scenarios.bull.probability,
			scenarios.base.probability,
			scenarios.bear.probability,
		);

	const bias =
		calculateBias(
			probabilityBreakdown
				.bullNormalized,

			probabilityBreakdown
				.bearNormalized,
		);

	const riskLevel =
		calculateRiskLevel(input);

	const grade =
		calculateFutureMapGrade({
			primaryProbability:
				scenarios[primaryScenario]
					.probability,

			confidence,

			conflictScore:
				probabilityBreakdown
					.conflictScore,

			riskLevel,

			missingInputCount:
				missingInputs.length,
		});

	const supportingFactors =
		evidence
			.filter(
				(item) =>
					item.scenario ===
					primaryScenario,
			)
			.sort(
				(first, second) =>
					evidenceStrength(second) -
					evidenceStrength(first),
			)
			.slice(0, 6)
			.map(
				(item) =>
					item.message,
			);

	const riskFactors =
		evidence
			.filter(
				(item) =>
					item.scenario === "bear" ||
					(
						item.category === "risk" &&
						item.impact < 0
					),
			)
			.sort(
				(first, second) =>
					evidenceStrength(second) -
					evidenceStrength(first),
			)
			.slice(0, 6)
			.map(
				(item) =>
					item.message,
			);

	const futureMapWithoutTradePlan = {
		symbol:
			input.symbol,

		horizon:
			input.horizon ?? "swing",

		currentPrice:
			input.currentPrice ?? null,

		bias,
		grade,
		riskLevel,

		confidence,

		primaryScenario,

		bullProbability:
			scenarios.bull.probability,

		baseProbability:
			scenarios.base.probability,

		bearProbability:
			scenarios.bear.probability,

		bull:
			scenarios.bull,

		base:
			scenarios.base,

		bear:
			scenarios.bear,

		evidence,

		supportingFactors,
		riskFactors,
		missingInputs,

		probabilityBreakdown,

		expectedMove:
			scenarios.expectedMove,

		supportLevels:
			scenarios.supports,

		resistanceLevels:
			scenarios.resistances,

		calculatedAt:
			input.calculatedAt ??
			new Date().toISOString(),

		methodologyNotice:
			"FutureMap presents model-relative scenarios based on currently available AMSA evidence. Targets, ranges, invalidation levels, and reward-to-risk calculations are model outputs rather than guarantees or personalized investment recommendations.",
	} satisfies Omit<
		AMSAFutureMap,
		"tradePlan"
	>;

	const tradePlan =
		createFutureMapTradePlan(
			futureMapWithoutTradePlan,
		);

	return {
		...futureMapWithoutTradePlan,
		tradePlan,
	};
}

function normalizeInput(
	input: AMSAFutureMapInput,
): AMSAFutureMapInput {
	const symbol =
		input.symbol
			.trim()
			.toUpperCase();

	if (
		!symbol ||
		!/^[A-Z0-9.^:-]{1,30}$/.test(
			symbol,
		)
	) {
		throw new Error(
			"FutureMap requires a valid symbol.",
		);
	}

	return {
		...input,
		symbol,

		horizon:
			input.horizon ??
			"swing",

		currentPrice:
			normalizePositiveNumber(
				input.currentPrice,
			),

		stockPulse:
			normalizeScore(
				input.stockPulse,
			),

		stockConfidence:
			normalizeScore(
				input.stockConfidence,
			),

		marketPulse:
			normalizeScore(
				input.marketPulse,
			),

		marketConfidence:
			normalizeScore(
				input.marketConfidence,
			),

		sectorPulse:
			normalizeScore(
				input.sectorPulse,
			),

		sectorConfidence:
			normalizeScore(
				input.sectorConfidence,
			),

		industryPulse:
			normalizeScore(
				input.industryPulse,
			),

		industryConfidence:
			normalizeScore(
				input.industryConfidence,
			),

		alignmentScore:
			normalizeScore(
				input.alignmentScore,
			),

		alignmentConfidence:
			normalizeScore(
				input.alignmentConfidence,
			),
	};
}

function determinePrimaryScenario(
	bull: number,
	base: number,
	bear: number,
): AMSAFutureScenarioType {
	if (
		bull >= base &&
		bull >= bear
	) {
		return "bull";
	}

	if (
		bear >= bull &&
		bear >= base
	) {
		return "bear";
	}

	return "base";
}

function calculateBias(
	bullProbability: number,
	bearProbability: number,
): AMSAFutureMapBias {
	const spread =
		bullProbability -
		bearProbability;

	if (spread >= 38) {
		return "Strong Bullish";
	}

	if (spread >= 14) {
		return "Bullish";
	}

	if (spread <= -38) {
		return "Strong Bearish";
	}

	if (spread <= -14) {
		return "Bearish";
	}

	return "Balanced";
}

function calculateRiskLevel(
	input: AMSAFutureMapInput,
): AMSAFutureMapRiskLevel {
	const riskControl =
		input.components
			?.riskControl;

	const volatilityControl =
		input.components
			?.volatilityControl;

	const controlScores = [
		riskControl,
		volatilityControl,
	].filter(
		isFiniteNumber,
	);

	if (!controlScores.length) {
		return "Unavailable";
	}

	const averageControl =
		controlScores.reduce(
			(total, score) =>
				total + score,
			0,
		) /
		controlScores.length;

	if (averageControl >= 80) {
		return "Low";
	}

	if (averageControl >= 62) {
		return "Moderate";
	}

	if (averageControl >= 45) {
		return "Elevated";
	}

	if (averageControl >= 25) {
		return "High";
	}

	return "Extreme";
}

function calculateFutureMapGrade({
	primaryProbability,
	confidence,
	conflictScore,
	riskLevel,
	missingInputCount,
}: {
	primaryProbability: number;
	confidence: number;
	conflictScore: number;
	riskLevel: AMSAFutureMapRiskLevel;
	missingInputCount: number;
}): AMSAFutureMapGrade {
	const riskPenalty =
		riskLevel === "Extreme"
			? 22
			: riskLevel === "High"
				? 14
				: riskLevel === "Elevated"
					? 7
					: 0;

	const missingPenalty =
		Math.min(
			missingInputCount * 1.6,
			16,
		);

	const composite = clamp(
		primaryProbability * 0.42 +
			confidence * 0.48 +
			(
				100 -
				conflictScore
			) *
				0.1 -
			riskPenalty -
			missingPenalty,
	);

	if (composite >= 88) return "A+";
	if (composite >= 80) return "A";
	if (composite >= 73) return "B+";
	if (composite >= 66) return "B";
	if (composite >= 58) return "C+";
	if (composite >= 48) return "C";

	return "D";
}

function evidenceStrength(
	item: {
		impact: number;
		confidence: number;
	},
): number {
	return (
		Math.abs(item.impact) *
		item.confidence /
		100
	);
}

function normalizeScore(
	value: number | null | undefined,
): number | null {
	return isFiniteNumber(value)
		? round(clamp(value))
		: null;
}

function normalizePositiveNumber(
	value: number | null | undefined,
): number | null {
	return isFiniteNumber(value) &&
		value > 0
		? value
		: null;
}