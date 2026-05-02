export const SIGI_NAVIGATION_WORDS =
  /\b(open|go to|show page|stock page|chart|live chart|workspace|take me to)\b/i;

export function shouldNavigateFromSigi(message: string) {
  return SIGI_NAVIGATION_WORDS.test(message);
}