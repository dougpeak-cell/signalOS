import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { LiveMarketProvider } from "@/components/market/LiveMarketProvider";
import MarketContextSyncBridge from "@/components/providers/MarketContextSyncBridge";
import AppQuoteBootstrap from "@/components/providers/AppQuoteBootstrap";
import AuthSplashReset from "@/components/providers/AuthSplashReset";
import { MarketDataProvider } from "@/components/providers/MarketDataProvider";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import PulseChangeAlerts from "@/components/mobile/PulseChangeAlerts";
import { GlobalTickerProvider } from "@/components/sigi/GlobalTickerContext";
import { SelectedTickerProvider } from "@/components/sigi/SelectedTickerContext";
import { SignalProvider } from "@/context/SignalContext";
import MembershipPauseNotice from "@/components/shared/MembershipPauseNotice";

export const metadata: Metadata = {
  title: "SigiOS Elite",
  description: "SigiOS market intelligence and trading workspace.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black text-white antialiased">
        <MembershipPauseNotice />
        <SignalProvider>
          <MarketDataProvider>
            <LiveMarketProvider>
              <SelectedTickerProvider>
                <GlobalTickerProvider>
                  <MarketContextSyncBridge />
                  <AppQuoteBootstrap />
                  <AuthSplashReset />
                  {children}
                  <PulseChangeAlerts />
                  <Suspense fallback={null}>
                    <MobileBottomNav />
                  </Suspense>
                </GlobalTickerProvider>
              </SelectedTickerProvider>
            </LiveMarketProvider>
          </MarketDataProvider>
        </SignalProvider>
      </body>
    </html>
  );
}