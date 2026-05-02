import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SigiAssistantResponse } from "@/lib/sigi/todayAssistant";

type StoredConversationContextRow = {
  id: number;
  user_id: string;
  question: string;
  response_title: string;
  response_summary: string;
  cited_tickers: string[] | null;
  created_at: string;
};

export async function loadConversationContext(userId: string, limit = 3): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sigi_conversation_contexts")
    .select("question, response_title, response_summary, cited_tickers, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load Sigi conversation context", error);
    return [];
  }

  return ((data as StoredConversationContextRow[] | null) ?? []).map((row) => {
    const tickers = (row.cited_tickers ?? []).filter(Boolean).slice(0, 3).join(", ");
    const tickerLabel = tickers ? ` | Tickers: ${tickers}` : "";
    return `Q: ${row.question}\nA: ${row.response_title} — ${row.response_summary}${tickerLabel}`;
  });
}

export async function saveConversationContext(
  userId: string,
  question: string,
  response: SigiAssistantResponse
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("sigi_conversation_contexts").insert({
    user_id: userId,
    question,
    response_title: response.title,
    response_summary: response.summary,
    cited_tickers: response.citedTickers.slice(0, 5),
  });

  if (error) {
    console.error("Failed to save Sigi conversation context", error);
  }
}