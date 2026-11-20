import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { loadPullbackItem } from "@/lib/pullback/provider";
import type { PullbackItem, PullbackWatch } from "@/lib/pullback/types";
import type { Firm } from "@/lib/pullback/engine";

export async function processPullbackWatch(userId: string, watch: PullbackWatch): Promise<PullbackItem> {
  async function record(item: PullbackItem): Promise<void> {
    const { error } = await createSupabaseAdminClient().rpc("record_pullback_evaluation", {
      p_user: userId, p_symbol: watch.symbol, p_snapshot: item,
    });
    if (error) throw new Error("Pullback Watch could not persist its evaluation. Apply the database migrations and retry.");
  }
  // Timely analyst/price events must not wait for slower disclosure sources.
  const item = await loadPullbackItem(
    watch.symbol, watch.trusted_firms, watch.snapshot?.evaluation, new Date(), watch.notify ? watch.notify_since : null, record,
  );
  await record(item);
  return item;
}

export async function savePullbackWatch(userId: string, symbol: string, trusted: Firm[], notify: boolean, onlyIfMissing = false): Promise<void> {
  const { error } = await createSupabaseAdminClient().from("pullback_watches").upsert({
    user_id: userId, symbol, trusted_firms: trusted, notify,
  }, { onConflict: "user_id,symbol", ignoreDuplicates: onlyIfMissing });
  if (error) throw new Error("Pullback Watch could not save notification preferences. Apply the local database migration and retry.");
}
