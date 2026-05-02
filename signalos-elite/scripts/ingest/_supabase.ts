import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE;

if (!url || !serviceKey) {
  console.error("Env debug:", {
    has_NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_SUPABASE_URL: !!process.env.SUPABASE_URL,
    has_NEXT_PUBLIC_SUPABASE_PROJECT_URL: !!process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
    has_SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    has_SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
    cwd: process.cwd(),
  });
  throw new Error("Missing SUPABASE URL or SERVICE ROLE KEY");
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
