"use client";

type AdminBackfillButtonProps = {
  onClick?: () => void;
  loading?: boolean;
};

export default function AdminBackfillButton({ onClick, loading }: AdminBackfillButtonProps) {
  return (
    <button
      type="button"
      className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? "Backfilling..." : "Backfill Results"}
    </button>
  );
}