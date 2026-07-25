import {
	clamp,
	isFiniteNumber,
	round,
} from "../math";

import type {
	AMSAFutureEvidence,
	AMSAFutureMapInput,
	AMSAFutureProbabilityBreakdown,
} from "../types";

/* =========================================================
	 FUTUREMAP(TM) CONFIDENCE ENGINE
========================================================= */

export function calculateFutureMapConfidence({
	input,
	evidence,
	probabilities,
}: {
	input: AMSAFutureMapInput;
	evidence: AMSAFutureEvidence[];
	probabilities: AMSAFutureProbabilityBreakdown;
}): number {
	if (!evidence.length) {
		return 0;
	}

	const averageEvidenceConfidence =
		evidence.reduce(
			(total, item) =>
				total + item.confidence,
			0,
		) /
		evidence.length;

	const coreInputs = [
		input.stockPulse,
		input.marketPulse,
		input.sectorPulse,
		input.industryPulse,
		input.alignmentScore,
		input.components?.trend,
		input.components?.volume,
		input.components?.riskControl,
		input.evolution?.change,
	];

	const availableCoreInputs =
		coreInputs.filter(
			isFiniteNumber,
		).length;

	const coverageScore =
		availableCoreInputs /
		coreInputs.length *
		100;

	const dominantProbability =
		Math.max(
			probabilities.bullNormalized,
			probabilities.baseNormalized,
			probabilities.bearNormalized,
		);

	const probabilitySeparation =
		calculateProbabilitySeparation(
			probabilities,
		);

	const conflictPenalty =
		probabilities.conflictScore *
		0.22;

	const uncertaintyPenalty =
		probabilities.uncertaintyScore *
		0.18;

	const confidence = clamp(
		averageEvidenceConfidence * 0.42 +
			coverageScore * 0.28 +
			dominantProbability * 0.12 +
			probabilitySeparation * 0.18 -
			conflictPenalty -
			uncertaintyPenalty,
	);

	return round(confidence);
}

function calculateProbabilitySeparation(
	probabilities: AMSAFutureProbabilityBreakdown,
): number {
	const sorted = [
		probabilities.bullNormalized,
		probabilities.baseNormalized,
		probabilities.bearNormalized,
	].sort(
		(first, second) =>
			second - first,
	);

	const separation =
		sorted[0] -
		sorted[1];

	return clamp(
		separation * 3.2,
	);
}