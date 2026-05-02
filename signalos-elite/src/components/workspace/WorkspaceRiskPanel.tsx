import { WorkspaceListStack, WorkspacePanel } from "@/components/workspace/WorkspacePanel";

type WorkspaceRiskPanelProps = {
  upsideLabel: string;
  supportLabel: string;
  resistanceLabel: string;
  avgVolumeLabel: string;
  risks: string[] | null | undefined;
};

export default function WorkspaceRiskPanel({
  upsideLabel,
  supportLabel,
  resistanceLabel,
  avgVolumeLabel,
  risks,
}: WorkspaceRiskPanelProps) {
  return (
    <WorkspacePanel title="Risk Surface">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-3">
          <span className="text-white/50">Upside</span>
          <span className="font-semibold text-emerald-300">{upsideLabel}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-3">
          <span className="text-white/50">20D Support</span>
          <span className="font-semibold text-white">{supportLabel}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-3">
          <span className="text-white/50">20D Resistance</span>
          <span className="font-semibold text-white">{resistanceLabel}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-3">
          <span className="text-white/50">Avg Volume</span>
          <span className="font-semibold text-white">{avgVolumeLabel}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-white/8 pt-4">
        <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/35">Risk Factors</div>
        <WorkspaceListStack
          items={risks}
          emptyText="No explicit risks have been attached to this setup yet."
        />
      </div>
    </WorkspacePanel>
  );
}