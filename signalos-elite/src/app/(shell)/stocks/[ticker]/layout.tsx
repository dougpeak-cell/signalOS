import { SignalProvider } from "@/context/SignalContext";

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SignalProvider>{children}</SignalProvider>;
}