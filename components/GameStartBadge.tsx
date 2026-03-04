"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  tipoff: string; // ISO string
};

export default function GameStartBadge({ tipoff }: Props) {
  const [status, setStatus] = useState<"live" | "soon" | "later">("later");

  const tipoffMs = useMemo(() => new Date(tipoff).getTime(), [tipoff]);

  useEffect(() => {
    function update() {
      const now = Date.now();
      const diff = tipoffMs - now;

      if (diff <= 0) setStatus("live");
      else if (diff <= 60 * 60 * 1000) setStatus("soon");
      else setStatus("later");
    }

    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [tipoffMs]);

  if (status === "later") return null;

  if (status === "live") {
    return (
      <span className="px-2 py-0.5 rounded border text-xs font-semibold text-green-700 border-green-300">
        🟢 LIVE
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded border text-xs font-semibold text-blue-700 border-blue-300">
      ⏱ Starting soon
    </span>
  );
}
