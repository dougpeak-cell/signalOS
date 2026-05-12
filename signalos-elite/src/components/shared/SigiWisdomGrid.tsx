"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const wisdomItems = [
  {
    title: "Patience over emotion",
    lesson:
      "Strong investors do not react emotionally to every red candle. Patience allows clear thinking and long-term decision making during volatility.",
    verse:
      "Ecclesiastes 7:8 - 'The patient in spirit is better than the proud in spirit.'",
  },
  {
    title: "Stewardship over greed",
    lesson:
      "Money is a responsibility before it is a reward. Stewardship means managing capital wisely instead of chasing emotional highs.",
    verse:
      "Luke 16:10 - 'Whoever can be trusted with very little can also be trusted with much.'",
  },
  {
    title: "Education over noise",
    lesson:
      "Financial media moves fast. Real investing requires filtering noise and understanding businesses, risk, and probability.",
    verse:
      "Proverbs 18:15 - 'The heart of the prudent acquires knowledge.'",
  },
  {
    title: "Faith during uncertainty",
    lesson:
      "Markets can become emotional and unpredictable. Confidence comes from preparation, discipline, and faith instead of fear.",
    verse: "Isaiah 41:10 - 'Fear not, for I am with you.'",
  },
  {
    title: "Disciplined long-term thinking",
    lesson:
      "Compounding rewards consistency over excitement. Long-term thinking often outperforms emotional short-term decisions.",
    verse: "Galatians 6:9 - 'Let us not grow weary of doing good.'",
  },
  {
    title: "Helping others build responsibly",
    lesson:
      "SigiOS exists to help everyday people grow knowledge, confidence, and healthy financial habits together.",
    verse: "Proverbs 11:25 - 'A generous person will prosper.'",
  },
];

export default function SigiWisdomGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {wisdomItems.map((item, index) => {
        const open = openIndex === index;

        return (
          <button
            key={item.title}
            type="button"
            onClick={() => setOpenIndex(open ? null : index)}
            className="group rounded-2xl border border-cyan-500/10 bg-[#071426] p-5 text-left transition hover:border-cyan-400/30 hover:bg-[#0a1c33]"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>

              <ChevronDown
                className={`h-5 w-5 shrink-0 text-cyan-300 transition ${open ? "rotate-180" : ""}`}
              />
            </div>

            {open ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm leading-7 text-white/75">{item.lesson}</p>

                <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
                  <p className="text-sm italic text-cyan-100">{item.verse}</p>
                </div>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}