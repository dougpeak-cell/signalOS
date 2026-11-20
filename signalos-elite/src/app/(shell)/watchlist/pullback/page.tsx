import PullbackWatch from "@/components/pullback/PullbackWatch";
import Link from "next/link";

export default function PullbackWatchPage(): React.JSX.Element {
  return <main className="mx-auto w-full max-w-3xl space-y-4 px-3 py-5 pb-28">
    <Link href="/watchlist" className="inline-flex min-h-11 items-center text-sm text-violet-200">&larr; Watchlist</Link>
    <PullbackWatch full defaultOpen />
  </main>;
}
