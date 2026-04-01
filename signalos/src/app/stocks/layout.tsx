import type { ReactNode } from "react";
import { SelectedSignalProvider } from "@/components/chart/SelectedSignalContext";

export default function StocksLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SelectedSignalProvider>{children}</SelectedSignalProvider>;
}