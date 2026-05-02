import ContextAwareRightRail from "@/components/shell/ContextAwareRightRail";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";

type WorkspaceSigiPanelProps = {
  thesis: string | null | undefined;
};

export default function WorkspaceSigiPanel({ thesis }: WorkspaceSigiPanelProps) {
  return (
    <WorkspacePanel title="Workspace Sigi">
      <div className="rounded-2xl border border-white/10 bg-white/4 px-3 py-3 text-sm leading-6 text-white/72">
        {thesis?.trim()
          ? thesis
          : "No thesis has been saved yet. Add a thesis to connect the chart setup to the actual trade idea."}
      </div>
      <div className="mt-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-2">
        <ContextAwareRightRail />
      </div>
    </WorkspacePanel>
  );
}