import {
	clamp,
	isFiniteNumber,
	round,
} from "../math";

import type {
	AMSADirection,
	AMSAFutureEvidence,
	AMSAFutureEvidenceCategory,
	AMSAFutureMapInput,
	AMSAPulseTrend,
	AMSAPulseVelocity,
} from "../types";

/* =========================================================
	 FUTUREMAP(TM) EVIDENCE ENGINE

	 Converts AMSA inputs into standardized evidence.

	 Impact:
	 +100 = strongly bullish
			0 = neutral
	 -100 = strongly bearish
========================================================= */

export function buildFutureEvidence(
	input: AMSAFutureMapInput,
): {
	evidence: AMSAFutureEvidence[];
	missingInputs: string[];
} {
	const evidence: AMSAFutureEvidence[] = [];
	const missingInputs: string[] = [];

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.stockPulse,
		confidence: input.stockConfidence,
		category: "stock",
		label: "Stock Pulse",
		missingLabel: "Stock Pulse",
		weight: 1,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.marketPulse,
		confidence: input.marketConfidence,
		category: "market",
		label: "Market Pulse",
		missingLabel: "Market Pulse",
		weight: 0.68,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.sectorPulse,
		confidence: input.sectorConfidence,
		category: "sector",
		label: "Sector Pulse",
		missingLabel: "Sector Pulse",
		weight: 0.78,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.industryPulse,
		confidence: input.industryConfidence,
		category: "industry",
		label: "Industry Pulse",
		missingLabel: "Industry Pulse",
		weight: 0.86,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.alignmentScore,
		confidence: input.alignmentConfidence,
		category: "alignment",
		label: "Hierarchical Alignment",
		missingLabel: "Alignment",
		weight: 0.92,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.components?.trend,
		confidence: input.stockConfidence,
		category: "trend",
		label: "Trend Persistence",
		missingLabel: "Trend score",
		weight: 0.9,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.components?.movingAverage,
		confidence: input.stockConfidence,
		category: "trend",
		label: "Moving-Average Structure",
		missingLabel: "Moving-average score",
		weight: 0.82,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.components?.volume,
		confidence: input.stockConfidence,
		category: "volume",
		label: "Volume Participation",
		missingLabel: "Volume score",
		weight: 0.72,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.components?.range,
		confidence: input.stockConfidence,
		category: "range",
		label: "Range Control",
		missingLabel: "Range score",
		weight: 0.62,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.components?.riskControl,
		confidence: input.stockConfidence,
		category: "risk",
		label: "Risk Control",
		missingLabel: "Risk-control score",
		weight: 0.78,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.components?.volatilityControl,
		confidence: input.marketConfidence,
		category: "volatility",
		label: "Volatility Control",
		missingLabel: "Volatility-control score",
		weight: 0.68,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.components?.breadth,
		confidence: input.marketConfidence,
		category: "breadth",
		label: "Market Breadth",
		missingLabel: "Market-breadth score",
		weight: 0.65,
	});

	addScoreEvidence({
		evidence,
		missingInputs,
		value: input.components?.macro,
		confidence: input.marketConfidence,
		category: "macro",
		label: "Macro Conditions",
		missingLabel: "Macro score",
		weight: 0.42,
	});

	addDirectionEvidence(
		evidence,
		"Stock Direction",
		"stock",
		input.stockDirection,
		0.74,
		input.stockConfidence,
	);

	addDirectionEvidence(
		evidence,
		"Market Direction",
		"market",
		input.marketDirection,
		0.45,
		input.marketConfidence,
	);

	addDirectionEvidence(
		evidence,
		"Sector Direction",
		"sector",
		input.sectorDirection,
		0.56,
		input.sectorConfidence,
	);

	addDirectionEvidence(
		evidence,
		"Industry Direction",
		"industry",
		input.industryDirection,
		0.64,
		input.industryConfidence,
	);

	addEvolutionEvidence(
		evidence,
		input.evolution,
	);

	addCatalystEvidence(
		evidence,
		input,
	);

	return {
		evidence: evidence.sort(
			(first, second) =>
				evidenceStrength(second) -
				evidenceStrength(first),
		),
		missingInputs: Array.from(
			new Set(missingInputs),
		),
	};
}

function addScoreEvidence({
	evidence,
	missingInputs,
	value,
	confidence,
	category,
	label,
	missingLabel,
	weight,
}: {
	evidence: AMSAFutureEvidence[];
	missingInputs: string[];

	value: number | null | undefined;
	confidence: number | null | undefined;

	category: AMSAFutureEvidenceCategory;

	label: string;
	missingLabel: string;

	weight: number;
}) {
	if (!isFiniteNumber(value)) {
		missingInputs.push(missingLabel);
		return;
	}

	const normalizedScore = clamp(value);
	const impact = clamp(
		(normalizedScore - 50) * 2 * weight,
		-100,
		100,
	);

	const evidenceConfidence = isFiniteNumber(confidence)
		? clamp(confidence)
		: 65;

	evidence.push({
		id: createEvidenceId(category, label),

		category,
		label,

		message: createScoreMessage(
			label,
			normalizedScore,
		),

		score: round(normalizedScore),
		impact: round(impact),

		confidence: round(evidenceConfidence),

		scenario: impact >= 12
			? "bull"
			: impact <= -12
				? "bear"
				: "neutral",

		importance: impactImportance(
			impact,
			evidenceConfidence,
		),
	});
}

function addDirectionEvidence(
	evidence: AMSAFutureEvidence[],
	label: string,
	category: AMSAFutureEvidenceCategory,
	direction: AMSADirection | null | undefined,
	weight: number,
	confidence: number | null | undefined,
) {
	if (
		!direction ||
		direction === "unavailable"
	) {
		return;
	}

	const baseImpact = directionImpact(direction);
	const impact = baseImpact * weight;

	evidence.push({
		id: createEvidenceId(category, label),

		category,
		label,

		message: `${label} is ${direction.replaceAll("-", " ")}.`,

		score: null,
		impact: round(impact),

		confidence: isFiniteNumber(confidence)
			? round(clamp(confidence))
			: 65,

		scenario: impact >= 10
			? "bull"
			: impact <= -10
				? "bear"
				: "neutral",

		importance: impactImportance(
			impact,
			isFiniteNumber(confidence)
				? confidence
				: 65,
		),
	});
}

function addEvolutionEvidence(
	evidence: AMSAFutureEvidence[],
	evolution: AMSAFutureMapInput["evolution"],
) {
	if (!evolution) {
		return;
	}

	if (isFiniteNumber(evolution.change)) {
		const impact = clamp(
			evolution.change * 6,
			-75,
			75,
		);

		evidence.push({
			id: "evolution-change",

			category: "evolution",
			label: "Pulse Change",

			message: evolution.change > 0
				? `Pulse improved by ${round(evolution.change)} points.`
				: evolution.change < 0
					? `Pulse weakened by ${round(
							Math.abs(evolution.change),
						)} points.`
					: "Pulse did not materially change.",

			score: evolution.currentScore ?? null,
			impact: round(impact),

			confidence: isFiniteNumber(evolution.confidence)
				? round(clamp(evolution.confidence))
				: 65,

			scenario: impact >= 10
				? "bull"
				: impact <= -10
					? "bear"
					: "neutral",

			importance: impactImportance(
				impact,
				evolution.confidence ?? 65,
			),
		});
	}

	if (isFiniteNumber(evolution.acceleration)) {
		const impact = clamp(
			evolution.acceleration * 4.5,
			-55,
			55,
		);

		evidence.push({
			id: "evolution-acceleration",

			category: "evolution",
			label: "Pulse Acceleration",

			message: evolution.acceleration > 0
				? "Pulse improvement is accelerating."
				: evolution.acceleration < 0
					? "Pulse momentum is decelerating."
					: "Pulse acceleration is stable.",

			score: null,
			impact: round(impact),

			confidence: isFiniteNumber(evolution.confidence)
				? round(clamp(evolution.confidence))
				: 60,

			scenario: impact >= 10
				? "bull"
				: impact <= -10
					? "bear"
					: "neutral",

			importance: impactImportance(
				impact,
				evolution.confidence ?? 60,
			),
		});
	}

	addVelocityEvidence(
		evidence,
		evolution.velocity,
		evolution.confidence,
	);

	addTrendEvidence(
		evidence,
		evolution.trend,
		evolution.confidence,
	);
}

function addVelocityEvidence(
	evidence: AMSAFutureEvidence[],
	velocity: AMSAPulseVelocity | null | undefined,
	confidence: number | null | undefined,
) {
	if (
		!velocity ||
		velocity === "Unavailable"
	) {
		return;
	}

	const impactMap: Record<
		Exclude<AMSAPulseVelocity, "Unavailable">,
		number
	> = {
		"Rapidly Accelerating": 72,
		Accelerating: 52,
		Improving: 28,
		Stable: 0,
		Weakening: -28,
		Deteriorating: -52,
		"Rapidly Deteriorating": -72,
	};

	const impact = impactMap[velocity];

	evidence.push({
		id: "evolution-velocity",

		category: "evolution",
		label: "Pulse Velocity",

		message: `Pulse velocity is ${velocity.toLowerCase()}.`,

		score: null,
		impact,

		confidence: isFiniteNumber(confidence)
			? round(clamp(confidence))
			: 65,

		scenario: impact > 0
			? "bull"
			: impact < 0
				? "bear"
				: "neutral",

		importance: impactImportance(
			impact,
			confidence ?? 65,
		),
	});
}

function addTrendEvidence(
	evidence: AMSAFutureEvidence[],
	trend: AMSAPulseTrend | null | undefined,
	confidence: number | null | undefined,
) {
	if (
		!trend ||
		trend === "Unavailable"
	) {
		return;
	}

	const impactMap: Record<
		Exclude<AMSAPulseTrend, "Unavailable">,
		number
	> = {
		"Strong Uptrend": 62,
		Uptrend: 38,
		Sideways: 0,
		Downtrend: -38,
		"Strong Downtrend": -62,
	};

	const impact = impactMap[trend];

	evidence.push({
		id: "evolution-trend",

		category: "evolution",
		label: "Pulse Evolution Trend",

		message: `Pulse Evolution is in a ${trend.toLowerCase()}.`,

		score: null,
		impact,

		confidence: isFiniteNumber(confidence)
			? round(clamp(confidence))
			: 65,

		scenario: impact > 0
			? "bull"
			: impact < 0
				? "bear"
				: "neutral",

		importance: impactImportance(
			impact,
			confidence ?? 65,
		),
	});
}

function addCatalystEvidence(
	evidence: AMSAFutureEvidence[],
	input: AMSAFutureMapInput,
) {
	for (const catalyst of input.catalysts ?? []) {
		const strength = isFiniteNumber(catalyst.strength)
			? clamp(catalyst.strength)
			: 60;

		const direction = catalyst.impact === "bullish"
			? 1
			: catalyst.impact === "bearish"
				? -1
				: 0;

		const impact = direction * strength * 0.7;

		evidence.push({
			id: catalyst.id ??
				createEvidenceId(
					"catalyst",
					catalyst.label,
				),

			category: "catalyst",
			label: catalyst.label,

			message: catalyst.description?.trim() ||
				`${catalyst.label} is classified as ${catalyst.impact}.`,

			score: strength,
			impact: round(impact),

			confidence: isFiniteNumber(catalyst.confidence)
				? round(clamp(catalyst.confidence))
				: 55,

			scenario: direction > 0
				? "bull"
				: direction < 0
					? "bear"
					: "neutral",

			importance: impactImportance(
				impact,
				catalyst.confidence ?? 55,
			),

			source: catalyst.source ?? null,
		});
	}
}

function createScoreMessage(
	label: string,
	score: number,
): string {
	if (score >= 80) {
		return `${label} is strongly constructive at ${round(score)}.`;
	}

	if (score >= 65) {
		return `${label} is constructive at ${round(score)}.`;
	}

	if (score >= 45) {
		return `${label} is mixed or neutral at ${round(score)}.`;
	}

	if (score >= 30) {
		return `${label} is weak at ${round(score)}.`;
	}

	return `${label} is critically weak at ${round(score)}.`;
}

function directionImpact(
	direction: AMSADirection,
): number {
	if (direction === "strongly-rising") return 70;
	if (direction === "rising") return 38;
	if (direction === "falling") return -38;
	if (direction === "strongly-falling") return -70;

	return 0;
}

function impactImportance(
	impact: number,
	confidence: number,
): AMSAFutureEvidence["importance"] {
	const adjustedStrength =
		Math.abs(impact) *
		(clamp(confidence) / 100);

	if (adjustedStrength >= 55) return "critical";
	if (adjustedStrength >= 35) return "high";
	if (adjustedStrength >= 16) return "medium";

	return "low";
}

function evidenceStrength(
	evidence: AMSAFutureEvidence,
): number {
	return (
		Math.abs(evidence.impact) *
		(evidence.confidence / 100)
	);
}

function createEvidenceId(
	category: string,
	label: string,
): string {
	return `${category}-${label}`
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-|-$/g, "");
}