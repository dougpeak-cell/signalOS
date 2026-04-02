import "./globals.css";
import AppQuoteBootstrap from "@/components/providers/AppQuoteBootstrap";
import { SignalProvider } from "@/context/SignalContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black text-white antialiased">
        <SignalProvider>
          <AppQuoteBootstrap />
          {children}
        </SignalProvider>
      </body>
    </html>
  );
}