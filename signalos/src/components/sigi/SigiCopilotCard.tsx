"use client";

import { useEffect, useState } from "react";

type Props = {
  text: string;
};

export default function SigiCopilotCard({ text }: Props) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    let i = 0;

    const interval = setInterval(() => {
      i++;
      setVisible(text.slice(0, i));

      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 8);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="text-[10px] uppercase tracking-widest text-cyan-300/70 mb-2">
        SIGI AI
      </div>

      <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
        {visible}
      </div>
    </div>
  );
}
