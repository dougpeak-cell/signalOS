import type { WorkspaceDirection } from "@/types/workspace";

export type WorkspacePulseLabel =
  | "Elite"
  | "Strong"
  | "Constructive"
  | "Balanced"
  | "Weak"
  | "Critical"
  | "Awaiting Pulse";

export type WorkspacePulseMeaning = {
  label: WorkspacePulseLabel;
  explanation: string;
};

export function getWorkspacePulseMeaning(
  pulse: number | null | undefined
): WorkspacePulseMeaning {
  if (pulse === null || pulse === undefined) {
    return {
      label: "Awaiting Pulse",
      explanation: "Sigi is waiting for enough verified market evidence.",
    };
  }

  if (pulse >= 90) {
    return {
      label: "Elite",
      explanation:
        "Exceptionally strong alignment across Sigi's verified market-state inputs.",
    };
  }

  if (pulse >= 80) {
    return {
      label: "Strong",
      explanation:
        "Strong market-state alignment with broad evidence supporting the setup.",
    };
  }

  if (pulse >= 68) {
    return {
      label: "Constructive",
      explanation:
        "Favorable evidence is present, although some factors still limit conviction.",
    };
  }

  if (pulse >= 48) {
    return {
      label: "Balanced",
      explanation:
        "Evidence is mixed. Sigi would look for improving trend, participation, or alignment.",
    };
  }

  if (pulse >= 30) {
    return {
      label: "Weak",
      explanation: "Several important inputs are not supporting the current setup.",
    };
  }

  return {
    label: "Critical",
    explanation:
      "Market-state evidence is weak and risk conditions deserve additional attention.",
  };
}

export function normalizeWorkspaceDirection(value: unknown): WorkspaceDirection {
  const direction = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (direction === "rising" || direction === "strongly-rising") return "Rising";
  if (direction === "stable") return "Stable";
  if (direction === "falling" || direction === "strongly-falling") return "Falling";
  if (direction === "improving") return "Improving";
  if (direction === "deteriorating") return "Deteriorating";
  return "Unknown";
}