"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

function parseNumber(value: FormDataEntryValue | null) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function addHolding(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const shares = parseNumber(formData.get("shares"));
  const avgCost = parseNumber(formData.get("avg_cost"));
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!ticker) throw new Error("Ticker is required.");
  if (shares == null || shares < 0) throw new Error("Shares must be 0 or greater.");

  const { error } = await supabase.from("portfolio_holdings").insert({
    ticker,
    shares,
    avg_cost: avgCost,
    notes: notesRaw || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/portfolio");
}

export async function updateHolding(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const id = parseNumber(formData.get("id"));
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const shares = parseNumber(formData.get("shares"));
  const avgCost = parseNumber(formData.get("avg_cost"));
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (id == null) throw new Error("Holding id is required.");
  if (!ticker) throw new Error("Ticker is required.");
  if (shares == null || shares < 0) throw new Error("Shares must be 0 or greater.");

  const { error } = await supabase
    .from("portfolio_holdings")
    .update({
      ticker,
      shares,
      avg_cost: avgCost,
      notes: notesRaw || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/portfolio");
}

export async function deleteHolding(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const id = parseNumber(formData.get("id"));
  if (id == null) throw new Error("Holding id is required.");

  const { error } = await supabase.from("portfolio_holdings").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/portfolio");
}
