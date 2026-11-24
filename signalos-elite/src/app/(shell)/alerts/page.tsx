import Link from "next/link";
import StockAlerts from "@/components/watchlist/StockAlerts";

export default function AlertsPage(): React.JSX.Element {
  return <main className="mx-auto w-full max-w-3xl space-y-4 px-3 py-5 pb-28">
    <Link href="/watchlist" className="inline-flex min-h-11 items-center text-sm text-cyan-200">&larr; Watchlist</Link>
    <StockAlerts full defaultOpen />
  </main>;
}
