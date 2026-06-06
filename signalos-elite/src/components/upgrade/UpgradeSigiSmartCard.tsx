"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Brain, Lock, Sparkles, Zap } from "lucide-react";
import { startSmartPreview } from "@/lib/premiumAccess";

export default function UpgradeSigiSmartCard() {
	const router = useRouter();
	const [isStartingPreview, setIsStartingPreview] = useState(false);

	function handleStartPreview() {
		setIsStartingPreview(true);
		startSmartPreview();
		router.refresh();
	}

	return (
		<div className="rounded-[28px] border border-cyan-400/25 bg-slate-950/80 p-6 shadow-[0_0_40px_rgba(6,182,212,0.12)]">
			<div className="mb-4 flex items-center gap-3">
				<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10">
					<Lock className="h-5 w-5 text-cyan-200" />
				</div>

				<div>
					<p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
						Sigi Smart
					</p>
					<h2 className="text-2xl font-black text-white">
						Go Deeper With Sigi Smart
					</h2>
				</div>
			</div>

			<p className="mb-5 text-sm leading-6 text-slate-300">
				You are seeing the market thesis preview. Start a free MSFT preview to
				open live candles and the trading workspace for Microsoft only, or
				upgrade to unlock ticker-by-ticker intelligence across the platform.
			</p>

			<div className="mb-6 space-y-3">
				<Feature icon={<Brain />} text="Personal AI market assistant" />
				<Feature icon={<Zap />} text="Ticker-by-ticker smart analysis" />
				<Feature icon={<Sparkles />} text="Today’s best setups and risks" />
			</div>

			<button
				type="button"
				onClick={handleStartPreview}
				className="block w-full rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/25"
			>
				{isStartingPreview ? "Opening MSFT Preview..." : "Start Free MSFT Preview"}
			</button>

			<Link
				href="/auth/upgrade?plan=smart"
				className="mt-3 block text-center text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80 transition hover:text-cyan-100"
			>
				Upgrade instead
			</Link>

			<p className="mt-3 text-center text-xs text-slate-400">
				Cancel subscription anytime.
			</p>

			<p className="mt-4 text-center text-xs text-slate-500">
				Free users can still view Today market highlights.
			</p>
		</div>
	);
}

function Feature({
	icon,
	text,
}: {
	icon: ReactNode;
	text: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
			<div className="text-cyan-300 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
			<p className="text-sm font-semibold text-slate-200">{text}</p>
		</div>
	);
}