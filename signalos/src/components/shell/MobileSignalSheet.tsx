"use client";

import { useState } from "react";

type Props = {
  title?: string;
  children: React.ReactNode;
};

export default function MobileSignalSheet({
  title = "Signal Intel",
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return open ? (
    <div className="absolute inset-x-0 bottom-0 max-h-[82vh] space-y-6 rounded-t-[28px] border border-white/10 bg-[#04111f] p-5 shadow-2xl">
      {children}
    </div>
  ) : null;
}
