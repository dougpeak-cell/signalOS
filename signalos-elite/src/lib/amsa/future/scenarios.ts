import {
	isFiniteNumber,
	round,
} from "../math";

import {
	calculateExpectedMove,
} from "./expectedMove";

import {
	calculateFuturePriceLevels,
	selectBearInvalidation,
	selectBullInvalidation,
} from "./levels";

import {
	calculateRiskReward,
	calculateScenarioQuality,
} from "./riskReward";

import type {
	AMSAFutureEvidence,
	AMSAFutureMapInput,
	AMSAFutureScenario,
} from "../types";

/* =========================================================
	 FUTUREMAP(TM) PHASE 4B SCENARIO GENERATOR
========================================================= */

export function generateFutureScenarios({
	input,
	bullProbability,
	baseProbability,
	bearProbability,
	confidence,
	evidence,
}: {
	input: AMSAFutureMapInput;

	bullProbability: number;
	baseProbability: number;
	bearProbability: number;

	confidence: number;

	evidence: AMSAFutureEvidence[];
}): {
	bull: AMSAFutureScenario;
	base: AMSAFutureScenario;
	bear: AMSAFutureScenario;

	expectedMove:
		ReturnType<
			typeof calculateExpectedMove
		>;

	supports:
		ReturnType<
			typeof calculateFuturePriceLevels
		>["supports"];

	resistances:
		ReturnType<
			typeof calculateFuturePriceLevels
		>["resistances"];
} {
	const expectedMove =
		calculateExpectedMove(input);

	const {
		supports,
		resistances,
	} =
		calculateFuturePriceLevels({
			input,
			expectedMove,
		});

	const currentPrice =
		validPrice(
			input.currentPrice,
		);

	const bullInvalidation =
		selectBullInvalidation({
			input,
			supports,
			expectedMove,
		});

	const bearInvalidation =
		selectBearInvalidation({
			input,
			resistances,
			expectedMove,
		});

	const bullTarget =
		calculateBullTarget({
			currentPrice,
			expectedMove,
			resistances,
			probability:
				bullProbability,
		});

	const bearTarget =
		calculateBearTarget({
			currentPrice,
			expectedMove,
			supports,
			probability:
				bearProbability,
		});

	const baseRange =
		calculateBaseRange({
			currentPrice,
			expectedMove,
			supports,
			resistances,
		});

	const bullRiskReward =
		calculateRiskReward({
			direction: "long",

			entryPrice:
				currentPrice,

			targetPrice:
				bullTarget.primary,

			invalidationPrice:
				bullInvalidation?.price,

			scenarioProbability:
				bullProbability,
		});

	const bearRiskReward =
		calculateRiskReward({
			direction: "short",

			entryPrice:
				currentPrice,

			targetPrice:
				bearTarget.primary,

			invalidationPrice:
				bearInvalidation?.price,

			scenarioProbability:
				bearProbability,
		});

	const bullQuality =
		calculateScenarioQuality({
			probability:
				bullProbability,

			confidence,

			riskReward:
				bullRiskReward,

			input,
		});

	const bearQuality =
		calculateScenarioQuality({
			probability:
				bearProbability,

			confidence,

			riskReward:
				bearRiskReward,

			input,
		});

	const baseQuality =
		calculateScenarioQuality({
			probability:
				baseProbability,

			confidence,

			riskReward: null,
			input,
		});

	const bullEvidence =
		evidence
			.filter(
				(item) =>
					item.scenario ===
					"bull",
			)
			.slice(0, 7);

	const bearEvidence =
		evidence
			.filter(
				(item) =>
					item.scenario ===
					"bear",
			)
			.slice(0, 7);

	const neutralEvidence =
		evidence
			.filter(
				(item) =>
					item.scenario ===
					"neutral",
			)
			.slice(0, 6);

	const bullTargetLevels =
		createTargetLevels({
			primary:
				bullTarget.primary,

			secondary:
				bullTarget.secondary,

			currentPrice,

			direction: "bull",
			confidence,
		});

	const bearTargetLevels =
		createTargetLevels({
			primary:
				bearTarget.primary,

			secondary:
				bearTarget.secondary,

			currentPrice,

			direction: "bear",
			confidence,
		});

	return {
		bull: {
			type: "bull",
			label: "Bull Scenario",

			probability:
				bullProbability,

			rawProbability:
				bullProbability,

			confidence,

			summary:
				createBullSummary({
					symbol:
						input.symbol,

					probability:
						bullProbability,

					target:
						bullTarget.primary,

					invalidation:
						bullInvalidation?.price ??
						null,
				}),

			requirements:
				buildBullRequirements(
					input,
				),

			supportingEvidence:
				bullEvidence,

			conflictingEvidence:
				bearEvidence.slice(0, 4),

			targetPrice:
				bullTarget.primary,

			targetChangePercent:
				percentageChange(
					currentPrice,
					bullTarget.primary,
				),

			expectedLow:
				bullTarget.secondary ??
				bullTarget.primary,

			expectedHigh:
				expectedMove
					.extendedRangeHigh,

			invalidationPrice:
				bullInvalidation?.price ??
				null,

			timeHorizon:
				horizonLabel(
					input.horizon ??
						"swing",
				),

			expectedMove,

			targetLevels:
				bullTargetLevels,

			invalidationLevel:
				bullInvalidation,

			riskReward:
				bullRiskReward,

			quality:
				bullQuality,
		},

		base: {
			type: "base",
			label: "Base Scenario",

			probability:
				baseProbability,

			rawProbability:
				baseProbability,

			confidence,

			summary:
				createBaseSummary({
					symbol:
						input.symbol,

					low:
						baseRange.low,

					high:
						baseRange.high,
				}),

			requirements:
				buildBaseRequirements(
					input,
				),

			supportingEvidence:
				neutralEvidence,

			conflictingEvidence: [
				...bullEvidence.slice(
					0,
					2,
				),
				...bearEvidence.slice(
					0,
					2,
				),
			],

			targetPrice:
				midpoint(
					baseRange.low,
					baseRange.high,
				),

			targetChangePercent:
				percentageChange(
					currentPrice,
					midpoint(
						baseRange.low,
						baseRange.high,
					),
				),

			expectedLow:
				baseRange.low,

			expectedHigh:
				baseRange.high,

			invalidationPrice: null,

			timeHorizon:
				horizonLabel(
					input.horizon ??
						"swing",
				),

			expectedMove,

			targetLevels:
				[
					createPriceLevel({
						price:
							baseRange.low,

						currentPrice,

						label:
							"Base Range Low",

						type:
							"range-low",

						confidence:
							expectedMove.confidence,

						description:
							"Lower boundary of the most likely consolidation range.",
					}),

					createPriceLevel({
						price:
							baseRange.high,

						currentPrice,

						label:
							"Base Range High",

						type:
							"range-high",

						confidence:
							expectedMove.confidence,

						description:
							"Upper boundary of the most likely consolidation range.",
					}),
				].filter(
					Boolean,
				) as AMSAFutureScenario["targetLevels"],

			invalidationLevel: null,

			riskReward: null,

			quality:
				baseQuality,
		},

		bear: {
			type: "bear",
			label: "Bear Scenario",

			probability:
				bearProbability,

			rawProbability:
				bearProbability,

			confidence,

			summary:
				createBearSummary({
					symbol:
						input.symbol,

					probability:
						bearProbability,

					target:
						bearTarget.primary,

					invalidation:
						bearInvalidation?.price ??
						null,
				}),

			requirements:
				buildBearRequirements(
					input,
				),

			supportingEvidence:
				bearEvidence,

			conflictingEvidence:
				bullEvidence.slice(0, 4),

			targetPrice:
				bearTarget.primary,

			targetChangePercent:
				percentageChange(
					currentPrice,
					bearTarget.primary,
				),

			expectedLow:
				expectedMove
					.extendedRangeLow,

			expectedHigh:
				bearTarget.secondary ??
				bearTarget.primary,

			invalidationPrice:
				bearInvalidation?.price ??
				null,

			timeHorizon:
				horizonLabel(
					input.horizon ??
						"swing",
				),

			expectedMove,

			targetLevels:
				bearTargetLevels,

			invalidationLevel:
				bearInvalidation,

			riskReward:
				bearRiskReward,

			quality:
				bearQuality,
		},

		expectedMove,
		supports,
		resistances,
	};
}

function calculateBullTarget({
	currentPrice,
	expectedMove,
	resistances,
	probability,
}: {
	currentPrice: number | null;

	expectedMove:
		ReturnType<
			typeof calculateExpectedMove
		>;

	resistances:
		ReturnType<
			typeof calculateFuturePriceLevels
		>["resistances"];

	probability: number;
}): {
	primary: number | null;
	secondary: number | null;
} {
	if (currentPrice === null) {
		return {
			primary: null,
			secondary: null,
		};
	}

	const calculatedTarget =
		currentPrice *
		(
			1 +
			expectedMove
				.bullMovePercent /
				100
		);

	const nearbyResistance =
		resistances.find(
			(level) =>
				level.price >=
					currentPrice *
						1.005 &&
				level.price <=
					calculatedTarget *
						1.08,
		);

	const probabilityAdjustment =
		0.84 +
		(probability /
			100) *
			0.28;

	const primary =
		nearbyResistance &&
		nearbyResistance
			.confidence >= 78
			? blendPrices(
					nearbyResistance.price,
					calculatedTarget,
					0.62,
				)
			: currentPrice +
				(
					calculatedTarget -
					currentPrice
				) *
					probabilityAdjustment;

	const secondary =
		nearbyResistance?.price ??
		expectedMove.normalRangeHigh;

	return {
		primary:
			roundPrice(primary),

		secondary:
			roundPrice(
				secondary,
			),
	};
}

function calculateBearTarget({
	currentPrice,
	expectedMove,
	supports,
	probability,
}: {
	currentPrice: number | null;

	expectedMove:
		ReturnType<
			typeof calculateExpectedMove
		>;

	supports:
		ReturnType<
			typeof calculateFuturePriceLevels
		>["supports"];

	probability: number;
}): {
	primary: number | null;
	secondary: number | null;
} {
	if (currentPrice === null) {
		return {
			primary: null,
			secondary: null,
		};
	}

	const calculatedTarget =
		currentPrice *
		(
			1 +
			expectedMove
				.bearMovePercent /
				100
		);

	const nearbySupport =
		supports.find(
			(level) =>
				level.price <=
					currentPrice *
						0.995 &&
				level.price >=
					calculatedTarget *
						0.92,
		);

	const probabilityAdjustment =
		0.84 +
		(probability /
			100) *
			0.28;

	const primary =
		nearbySupport &&
		nearbySupport
			.confidence >= 78
			? blendPrices(
					nearbySupport.price,
					calculatedTarget,
					0.62,
				)
			: currentPrice -
				(
					currentPrice -
					calculatedTarget
				) *
					probabilityAdjustment;

	const secondary =
		nearbySupport?.price ??
		expectedMove.normalRangeLow;

	return {
		primary:
			roundPrice(primary),

		secondary:
			roundPrice(
				secondary,
			),
	};
}

function calculateBaseRange({
	currentPrice,
	expectedMove,
	supports,
	resistances,
}: {
	currentPrice: number | null;

	expectedMove:
		ReturnType<
			typeof calculateExpectedMove
		>;

	supports:
		ReturnType<
			typeof calculateFuturePriceLevels
		>["supports"];

	resistances:
		ReturnType<
			typeof calculateFuturePriceLevels
		>["resistances"];
}): {
	low: number | null;
	high: number | null;
} {
	if (currentPrice === null) {
		return {
			low: null,
			high: null,
		};
	}

	const calculatedLow =
		currentPrice *
		(
			1 +
			expectedMove
				.baseMoveLowPercent /
				100
		);

	const calculatedHigh =
		currentPrice *
		(
			1 +
			expectedMove
				.baseMoveHighPercent /
				100
		);

	const nearbySupport =
		supports.find(
			(level) =>
				level.price >=
					calculatedLow *
						0.97 &&
				level.price <
					currentPrice,
		);

	const nearbyResistance =
		resistances.find(
			(level) =>
				level.price <=
					calculatedHigh *
						1.03 &&
				level.price >
					currentPrice,
		);

	return {
		low:
			roundPrice(
				nearbySupport?.price ??
				calculatedLow,
			),

		high:
			roundPrice(
				nearbyResistance?.price ??
				calculatedHigh,
			),
	};
}

function createTargetLevels({
	primary,
	secondary,
	currentPrice,
	direction,
	confidence,
}: {
	primary: number | null;
	secondary: number | null;
	currentPrice: number | null;

	direction:
		| "bull"
		| "bear";

	confidence: number;
}) {
	const levels = [];

	const primaryLevel =
		createPriceLevel({
			price: primary,
			currentPrice,

			label:
				direction === "bull"
					? "Bull Primary Target"
					: "Bear Primary Target",

			type: "target",

			confidence,

			description:
				"Primary FutureMap target based on volatility, probability, and technical structure.",
		});

	if (primaryLevel) {
		levels.push(
			primaryLevel,
		);
	}

	if (
		secondary !== null &&
		primary !== null &&
		(Math.abs(
			secondary - primary,
		) /
			primary) *
			100 >=
			0.4
	) {
		const secondaryLevel =
			createPriceLevel({
				price: secondary,
				currentPrice,

				label:
					direction === "bull"
						? "Bull Structural Target"
						: "Bear Structural Target",

				type: "target",

				confidence:
					confidence * 0.82,

				description:
					"Secondary target based on nearby structural support or resistance.",
			});

		if (secondaryLevel) {
			levels.push(
				secondaryLevel,
			);
		}
	}

	return levels;
}

function createPriceLevel({
	price,
	currentPrice,
	label,
	type,
	confidence,
	description,
}: {
	price: number | null;
	currentPrice: number | null;

	label: string;

	type:
		| "target"
		| "range-low"
		| "range-high";

	confidence: number;
	description: string;
}) {
	if (
		price === null ||
		currentPrice === null
	) {
		return null;
	}

	return {
		type,
		label,

		price:
			roundPrice(price)!,

		distancePercent:
			round(
				(Math.abs(
					price -
						currentPrice,
				) /
					currentPrice) *
					100,
			),

		strength:
			confidence >= 82
				? "strong" as const
				: confidence >= 65
					? "moderate" as const
					: "weak" as const,

		confidence:
			round(confidence),

		source:
			"calculated" as const,

		description,
	};
}

function buildBullRequirements(
	input: AMSAFutureMapInput,
): string[] {
	const requirements: string[] = [
		"Stock Pulse remains constructive.",
		"Price holds above the bullish invalidation level.",
	];

	if (
		isFiniteNumber(
			input.sectorPulse,
		)
	) {
		requirements.push(
			"Sector Pulse remains supportive.",
		);
	}

	if (
		isFiniteNumber(
			input.industryPulse,
		)
	) {
		requirements.push(
			"Industry leadership remains intact.",
		);
	}

	if (
		isFiniteNumber(
			input.marketPulse,
		)
	) {
		requirements.push(
			"Market Pulse avoids material deterioration.",
		);
	}

	if (
		isFiniteNumber(
			input.components?.volume,
		)
	) {
		requirements.push(
			"Volume participation confirms continuation.",
		);
	}

	return requirements.slice(
		0,
		6,
	);
}

function buildBaseRequirements(
	input: AMSAFutureMapInput,
): string[] {
	const requirements = [
		"Price remains between nearby support and resistance.",
		"Neither buyers nor sellers achieve decisive confirmation.",
		"Volume remains mixed or normalizes.",
	];

	if (
		isFiniteNumber(
			input.components
				?.volatilityControl,
		)
	) {
		requirements.push(
			"Volatility remains inside its current operating range.",
		);
	}

	return requirements;
}

function buildBearRequirements(
	input: AMSAFutureMapInput,
): string[] {
	const requirements: string[] = [
		"Price loses meaningful technical support.",
		"Stock Pulse weakens from its current state.",
	];

	if (
		isFiniteNumber(
			input.sectorPulse,
		)
	) {
		requirements.push(
			"Sector leadership deteriorates.",
		);
	}

	if (
		isFiniteNumber(
			input.marketPulse,
		)
	) {
		requirements.push(
			"Market conditions weaken or volatility expands.",
		);
	}

	if (
		isFiniteNumber(
			input.alignmentScore,
		)
	) {
		requirements.push(
			"Hierarchical alignment becomes conflicted.",
		);
	}

	return requirements;
}

function createBullSummary({
	symbol,
	probability,
	target,
	invalidation,
}: {
	symbol: string;
	probability: number;
	target: number | null;
	invalidation: number | null;
}): string {
	const targetText =
		target === null
			? "an unavailable target"
			: `$${formatPrice(
				target,
			)}`;

	const invalidationText =
		invalidation === null
			? "an unavailable invalidation level"
			: `$${formatPrice(
				invalidation,
			)}`;

	return `${symbol} has a ${round(
		probability,
	)}% bullish scenario with a primary target near ${targetText}. The scenario weakens below ${invalidationText}.`;
}

function createBaseSummary({
	symbol,
	low,
	high,
}: {
	symbol: string;
	low: number | null;
	high: number | null;
}): string {
	if (
		low === null ||
		high === null
	) {
		return `${symbol} has a consolidation scenario, but a reliable expected range is unavailable.`;
	}

	return `${symbol} has a consolidation scenario between approximately $${formatPrice(
		low,
	)} and $${formatPrice(
		high,
	)}.`;
}

function createBearSummary({
	symbol,
	probability,
	target,
	invalidation,
}: {
	symbol: string;
	probability: number;
	target: number | null;
	invalidation: number | null;
}): string {
	const targetText =
		target === null
			? "an unavailable downside target"
			: `$${formatPrice(
				target,
			)}`;

	const invalidationText =
		invalidation === null
			? "an unavailable invalidation level"
			: `$${formatPrice(
				invalidation,
			)}`;

	return `${symbol} has a ${round(
		probability,
	)}% bearish scenario with a downside target near ${targetText}. The scenario weakens above ${invalidationText}.`;
}

function percentageChange(
	currentPrice: number | null,
	futurePrice: number | null,
): number | null {
	if (
		currentPrice === null ||
		futurePrice === null
	) {
		return null;
	}

	return round(
		((
			futurePrice -
			currentPrice
		) /
			currentPrice) *
			100,
	);
}

function midpoint(
	first: number | null,
	second: number | null,
): number | null {
	if (
		first === null ||
		second === null
	) {
		return null;
	}

	return roundPrice(
		(
			first +
			second
		) /
			2,
	);
}

function blendPrices(
	structuralPrice: number,
	calculatedPrice: number,
	structuralWeight: number,
): number {
	return (
		structuralPrice *
			structuralWeight +
		calculatedPrice *
			(
				1 -
				structuralWeight
			)
	);
}

function horizonLabel(
	horizon:
		| "intraday"
		| "swing"
		| "position",
): string {
	if (horizon === "intraday") {
		return "Current session to approximately 2 trading sessions";
	}

	if (horizon === "position") {
		return "Approximately 20 to 60 trading sessions";
	}

	return "Approximately 5 to 20 trading sessions";
}

function validPrice(
	value:
		| number
		| null
		| undefined,
): number | null {
	return isFiniteNumber(value) &&
		value > 0
		? value
		: null;
}

function roundPrice(
	value: number | null,
): number | null {
	if (
		value === null ||
		!Number.isFinite(value) ||
		value <= 0
	) {
		return null;
	}

	if (value >= 1000) {
		return round(value, 1);
	}

	if (value >= 1) {
		return round(value, 2);
	}

	return round(value, 4);
}

function formatPrice(
	value: number,
): string {
	if (value >= 1000) {
		return value.toFixed(1);
	}

	if (value >= 1) {
		return value.toFixed(2);
	}

	return value.toFixed(4);
}