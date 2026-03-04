"use client";

import { useState } from "react";

type Props = {
  shareUrl: string;
};

export default function HomePageClient({ shareUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm"
        onClick={() => setOpen(true)}
      >
        Share
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Share</h2>
              <button
                type="button"
                className="text-sm"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-3">
              <input
                className="w-full rounded border px-2 py-2 text-sm"
                value={shareUrl}
                readOnly
              />
              <button
                type="button"
                className="mt-2 rounded-md border px-3 py-2 text-sm"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                Copy link
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
