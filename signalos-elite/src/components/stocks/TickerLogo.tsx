"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCompanyProfile } from "@/lib/companyCache";

const missingLogoTickers = new Set<string>();
const availableLogoTickers = new Set(["AAPL", "AMD", "AMZN", "META", "MSFT", "NVDA", "TSLA"]);

export default function TickerLogo({
  ticker,
  size = 36,
  logoUrl,
}: {
  ticker: string;
  size?: number;
  logoUrl?: string | null;
}) {
  const normalizedTicker = useMemo(
    () => String(ticker ?? "").toUpperCase().trim(),
    [ticker]
  );
  const hasLocalLogo = availableLogoTickers.has(normalizedTicker);
  const [remoteLogoUrl, setRemoteLogoUrl] = useState<string | null>(logoUrl ?? null);

  const [failed, setFailed] = useState(
    () => !hasLocalLogo && !logoUrl || missingLogoTickers.has(normalizedTicker)
  );

  useEffect(() => {
    setRemoteLogoUrl(logoUrl ?? null);
  }, [logoUrl]);

  useEffect(() => {
    setFailed((!hasLocalLogo && !remoteLogoUrl) || missingLogoTickers.has(normalizedTicker));
  }, [hasLocalLogo, normalizedTicker, remoteLogoUrl]);

  useEffect(() => {
    if (!normalizedTicker || hasLocalLogo || remoteLogoUrl || missingLogoTickers.has(normalizedTicker)) {
      return;
    }

    let active = true;

    void fetchCompanyProfile(normalizedTicker)
      .then((profile) => {
        if (!active) {
          return;
        }

        if (profile?.logo) {
          setRemoteLogoUrl(profile.logo);
          setFailed(false);
          return;
        }

        setFailed(true);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [hasLocalLogo, normalizedTicker, remoteLogoUrl]);

  const src = `/logos/${normalizedTicker.toLowerCase()}.png`;
  const imageAlt = `${normalizedTicker} logo`;

  if (!normalizedTicker || failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-white/85"
        style={{ width: size, height: size }}
      >
        {normalizedTicker.slice(0, 1) || "?"}
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5"
      style={{ width: size, height: size }}
    >
      {hasLocalLogo ? (
        <img
          src={src}
          alt={imageAlt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => {
            setFailed(!remoteLogoUrl);
          }}
        />
      ) : remoteLogoUrl ? (
        <img
          src={remoteLogoUrl}
          alt={imageAlt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (normalizedTicker) {
              missingLogoTickers.add(normalizedTicker);
            }
            setRemoteLogoUrl(null);
            setFailed(true);
          }}
        />
      ) : null}
    </div>
  );
}
