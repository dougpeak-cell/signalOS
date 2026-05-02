import type { ReactNode } from "react";

import ShellLayout from "@/app/(shell)/layout";

export default function CryptoLayout({ children }: { children: ReactNode }) {
  return <ShellLayout>{children}</ShellLayout>;
}