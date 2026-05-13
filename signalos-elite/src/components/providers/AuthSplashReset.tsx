"use client";

import { useEffect } from "react";
import { MOBILE_SIGI_SPLASH_STORAGE_KEY } from "@/components/mobile/MobileSigiSplash";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthSplashReset() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.localStorage.removeItem(MOBILE_SIGI_SPLASH_STORAGE_KEY);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}