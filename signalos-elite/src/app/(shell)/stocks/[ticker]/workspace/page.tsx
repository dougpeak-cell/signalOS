import { ClientProvider } from "@/components/ClientProvider";
import StockTradingWorkspace from "@/components/workspace/StockTradingWorkspace";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getDevPreviewTier } from "@/lib/sigi/devPreview";
import { getPremiumAccess } from "@/lib/premiumAccess";
import { normalizeTicker } from "@/lib/tickerAliases";
import { getStockWorkspaceData } from "@/lib/workspace/stockWorkspaceData";

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

export default async function StockWorkspacePage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const previewTier = await getDevPreviewTier();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let plan = "free";

  if (user?.id) {
    const { data } = await supabase
      .from("profiles")
      .select("sigi_tier, subscription_tier, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    plan =
      (typeof data?.sigi_tier === "string" && data.sigi_tier) ||
      (typeof data?.subscription_tier === "string" && data.subscription_tier) ||
      (typeof data?.plan === "string" && data.plan) ||
      "free";
  }

  const effectivePlan = previewTier || plan;
  const normalizedTicker = normalizeTicker(ticker);
  const canUseTradingWorkspace =
    effectivePlan === "pro" ||
    getPremiumAccess({
      tier: effectivePlan as "free" | "smart" | "pro",
      ticker: normalizedTicker,
      feature: "stock",
    });

  if (!canUseTradingWorkspace) {
    redirect("/auth/upgrade?plan=pro&feature=trading-workspace");
  }

  const data = await getStockWorkspaceData(ticker);

  return (
    <div className="min-h-screen bg-black text-white">
      <ClientProvider tickers={[data.liveTicker]} sparklineTickers={[data.liveTicker]} />
      <div className="mx-auto w-full max-w-none px-4 pb-10 pt-4 sm:px-5 xl:px-6">
        <StockTradingWorkspace data={data} />
      </div>
    </div>
  );
}