import Link from "next/link";

export function LegalLinks() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-600">
      <Link className="hover:text-neutral-900" href="/terms">
        Terms
      </Link>
      <Link className="hover:text-neutral-900" href="/privacy">
        Privacy
      </Link>
      <Link className="hover:text-neutral-900" href="/billing">
        Billing
      </Link>
    </div>
  );
}
