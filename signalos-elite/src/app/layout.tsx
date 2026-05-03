import "./globals.css";
import type { Metadata } from "next";
import { LiveMarketProvider } from "@/components/market/LiveMarketProvider";
import MarketContextSyncBridge from "@/components/providers/MarketContextSyncBridge";
import AppQuoteBootstrap from "@/components/providers/AppQuoteBootstrap";
import { MarketDataProvider } from "@/components/providers/MarketDataProvider";
import { GlobalTickerProvider } from "@/components/sigi/GlobalTickerContext";
import { SelectedTickerProvider } from "@/components/sigi/SelectedTickerContext";
import { SignalProvider } from "@/context/SignalContext";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black text-white antialiased">
        <SignalProvider>
          <MarketDataProvider>
            <LiveMarketProvider>
              <SelectedTickerProvider>
                <GlobalTickerProvider>
                  <MarketContextSyncBridge />
                  <AppQuoteBootstrap />
                  {children}
                </GlobalTickerProvider>
              </SelectedTickerProvider>
            </LiveMarketProvider>
          </MarketDataProvider>
        </SignalProvider>
      </body>
    </html>
  );
}