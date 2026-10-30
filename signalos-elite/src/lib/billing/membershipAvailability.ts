export const MEMBERSHIP_SIGNUPS_PAUSED: boolean = true;

export const MEMBERSHIP_PAUSE_MESSAGE: string =
  "Under construction. New paid membership sign-ups are temporarily paused. Existing members can still sign in and manage their subscriptions.";

export function assertMembershipSignupsOpen(): void {
  if (MEMBERSHIP_SIGNUPS_PAUSED) {
    throw new Error(MEMBERSHIP_PAUSE_MESSAGE);
  }
}