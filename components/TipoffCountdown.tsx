"use client";

import { useEffect, useState } from "react";

export default function TipoffCountdown({ tipoff }: { tipoff: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date().getTime();
      const t = new Date(tipoff).getTime();
      const diff = t - now;

      if (diff <= 0) {
        setLabel("🟢 LIVE");
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);

      setLabel(`Starts in ${h}h ${m}m`);
    }

    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [tipoff]);

  if (!label) return null;

  return (
    <div className="text-xs text-blue-600 font-semibold">
      {label}
    </div>
  );
}
