import "./globals.css";
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
          {children}
        </SignalProvider>
      </body>
    </html>
  );
}