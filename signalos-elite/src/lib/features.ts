function isEnabled(value: string | undefined, fallback = false) {
  if (value == null) {
    return fallback;
  }

  return value === "true";
}

export const features = {
  visionEnabled: isEnabled(process.env.NEXT_PUBLIC_VISION_ENABLED, true),
  visionBeta: isEnabled(process.env.NEXT_PUBLIC_VISION_BETA),
};