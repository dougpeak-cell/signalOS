import { Construction } from "lucide-react";
import { MEMBERSHIP_PAUSE_MESSAGE, MEMBERSHIP_SIGNUPS_PAUSED } from "@/lib/billing/membershipAvailability";

export default function MembershipPauseNotice(): React.JSX.Element | null {
  if (!MEMBERSHIP_SIGNUPS_PAUSED) return null;

  return (
    <aside role="status" aria-label="Membership sign-ups paused" className="border-b border-amber-300/25 bg-amber-950 px-4 py-3 text-amber-100">
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <Construction aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="min-w-0 text-sm leading-6">{MEMBERSHIP_PAUSE_MESSAGE}</p>
      </div>
    </aside>
  );
}