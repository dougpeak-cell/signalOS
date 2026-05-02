"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  decodeReturnTo,
  isSafeInternalReturnTo,
} from "@/lib/routing/returnNavigation";

type Props = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export default function ReturnToContextButton({
  fallbackHref = "/",
  label = "Back to context",
  className = "",
}: Props) {
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get("returnTo");
  const decodedReturnTo = decodeReturnTo(rawReturnTo);

  const href = isSafeInternalReturnTo(decodedReturnTo)
    ? decodedReturnTo
    : fallbackHref;

  return (
    <Link
      href={href}
      className={[
        "inline-flex rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/85 transition hover:bg-black/30",
        className,
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
