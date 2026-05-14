"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  CreditCard,
  LogOut,
  LogIn,
  Settings,
  User,
} from "lucide-react";
import { useSigiTier } from "@/hooks/useSigiTier";
import {
  SIGI_PROFILE_CHANGED_EVENT,
  getSigiProfile,
} from "@/lib/sigi/sigiProfile";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  hasAccountSession?: boolean;
};

type UserState = {
  userName: string;
  email: string | null;
};

function getAuthEntryHref(pathname: string | null): string {
  if (!pathname) {
    return "/auth";
  }

  return `/auth?next=${encodeURIComponent(pathname)}`;
}

function getNameFromEmail(email: string | null): string {
  if (!email) return "Member";

  const [localPart] = email.split("@");
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "Member";

  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "S";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function resolveTierLabel(tier: string): string {
  if (tier === "pro") return "Elite Member";
  if (tier === "smart") return "Smart Member";
  return "Standard Member";
}

function getHeaderName(hasClientSession: boolean, userName: string): string {
  if (!hasClientSession) return "Account";
  return userName;
}

function MenuLinkItem({
  href,
  icon,
  label,
  sub,
  onSelect,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  sub: string;
  onSelect?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-start gap-3 rounded-2xl px-4 py-3 transition-all hover:bg-cyan-500/10"
    >
      <div className="mt-0.5 text-cyan-300">{icon}</div>

      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="mt-1 text-xs text-cyan-100/60">{sub}</div>
      </div>
    </Link>
  );
}

export default function AccountMenu({ hasAccountSession = false }: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { tier, setPlanSummary } = useSigiTier();
  const [hasClientSession, setHasClientSession] = useState(hasAccountSession);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"billing" | "logout" | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserState>({
    userName: "Member",
    email: null,
  });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled) {
          setHasClientSession(Boolean(session));
        }
      } catch {
        if (!cancelled) {
          setHasClientSession(hasAccountSession);
        }
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasClientSession(Boolean(session));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hasAccountSession, supabase]);

  useEffect(() => {
    if (!hasClientSession) {
      setUserState({ userName: "Member", email: null });
      return;
    }

    let cancelled = false;

    const syncUser = async () => {
      const sigiProfile = getSigiProfile();
      const fallbackName = sigiProfile?.name?.trim() || "Member";

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        const metadataName = [
          user?.user_metadata?.name,
          user?.user_metadata?.full_name,
          user?.user_metadata?.preferred_username,
        ].find((value): value is string => typeof value === "string" && value.trim().length > 0);

        const email = user?.email ?? null;

        setUserState({
          userName: metadataName?.trim() || fallbackName || getNameFromEmail(email),
          email,
        });
      } catch {
        if (cancelled) return;

        setUserState({
          userName: fallbackName,
          email: null,
        });
      }
    };

    void syncUser();

    const syncProfile = () => {
      void syncUser();
    };

    window.addEventListener(SIGI_PROFILE_CHANGED_EVENT, syncProfile);

    return () => {
      cancelled = true;
      window.removeEventListener(SIGI_PROFILE_CHANGED_EVENT, syncProfile);
    };
  }, [hasClientSession, supabase]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const userName = userState.userName.trim() || "Member";
  const headerName = getHeaderName(hasClientSession, userName);
  const email = userState.email;
  const initials = getInitials(headerName);
  const tierLabel = resolveTierLabel(tier);
  const isPremium = tier === "smart" || tier === "pro";
  const authEntryHref = getAuthEntryHref(pathname);

  async function handleLogout() {
    setBusy("logout");
    setBillingError(null);

    try {
      await supabase.auth.signOut();
      setPlanSummary({
        currentTier: "free",
        nextTier: "smart",
        hasSmartFeatures: false,
        hasProFeatures: false,
        isSignedIn: false,
      });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  async function handleBilling() {
    setBusy("billing");
    setBillingError(null);

    if (tier === "free") {
      setBusy(null);
      setOpen(false);
      router.push("/settings/sigi#billing");
      return;
    }

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { error?: string; url?: string };

      if (!res.ok) {
        throw new Error(data.error || "Unable to open billing portal");
      }

      if (!data.url) {
        throw new Error("Unable to open billing portal");
      }

      window.location.href = data.url;
    } catch (error) {
      setBillingError(
        error instanceof Error ? error.message : "Unable to open billing portal"
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-black/40 px-2.5 py-2 text-white backdrop-blur-xl transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.18)] md:px-3"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-xs font-bold text-cyan-200 md:text-sm">
          {initials}
        </div>

        <div className="hidden text-left md:block">
          <div className="text-sm font-semibold leading-none text-white">
            {headerName}
          </div>
          <div className="mt-1 text-[11px] text-cyan-300/70">
            {hasClientSession ? tierLabel : "Profile, Settings, Billing"}
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#071018]/95 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,255,255,0.12)]">
          <div className="border-b border-cyan-400/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-lg font-bold text-cyan-100">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {hasClientSession ? userName : "SignalOS Account"}
                </div>

                {email ? (
                  <div className="mt-1 truncate text-xs text-cyan-200/60">
                    {email}
                  </div>
                ) : !hasClientSession ? (
                  <div className="mt-1 truncate text-xs text-cyan-200/60">
                    Secure access to profile, settings, and billing.
                  </div>
                ) : null}

                <div className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  {hasClientSession
                    ? isPremium
                      ? tierLabel.replace(" Member", "")
                      : "Standard"
                    : "Account"}
                </div>
              </div>
            </div>
          </div>

          <div className="p-2">
            {!hasClientSession ? (
              <MenuLinkItem
                href={authEntryHref}
                icon={<LogIn size={18} />}
                label="Sign In / Create Account"
                sub="Open your SignalOS account and sync profile, settings, and billing"
                onSelect={() => setOpen(false)}
              />
            ) : null}

            <MenuLinkItem
              href="/settings/sigi#profile"
              icon={<User size={18} />}
              label="Profile"
              sub="Review your account identity and Sigi profile"
              onSelect={() => setOpen(false)}
            />

            <MenuLinkItem
              href="/settings/sigi#settings"
              icon={<Settings size={18} />}
              label="Settings"
              sub="Customize your SignalOS experience"
              onSelect={() => setOpen(false)}
            />

            <button
              type="button"
              onClick={() => void handleBilling()}
              disabled={busy === "billing"}
              className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="mt-0.5 text-cyan-300">
                <CreditCard size={18} />
              </div>

              <div>
                <div className="text-sm font-semibold text-white">Billing</div>
                <div className="mt-1 text-xs text-cyan-100/60">
                  {busy === "billing"
                    ? "Opening secure billing portal"
                    : tier === "free"
                      ? "Upgrade or manage your Sigi plan"
                      : "Manage subscription and invoices"}
                </div>
              </div>
            </button>

            {hasClientSession ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={busy === "logout"}
                className="mt-2 flex w-full items-start gap-3 rounded-2xl border border-red-500/10 px-4 py-3 text-left transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mt-0.5 text-red-300">
                  <LogOut size={18} />
                </div>

                <div>
                  <div className="text-sm font-semibold text-red-200">Logout</div>
                  <div className="mt-1 text-xs text-red-200/60">
                    {busy === "logout"
                      ? "Signing out securely"
                      : "Securely sign out of SignalOS"}
                  </div>
                </div>
              </button>
            ) : null}

            {billingError ? (
              <div className="mt-2 rounded-2xl border border-rose-400/18 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                {billingError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}