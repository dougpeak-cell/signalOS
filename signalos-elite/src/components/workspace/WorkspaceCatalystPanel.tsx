import { WorkspaceListStack, WorkspacePanel } from "@/components/workspace/WorkspacePanel";

type WorkspaceCatalystPanelProps = {
  catalysts: string[] | null | undefined;
};

export default function WorkspaceCatalystPanel({
  catalysts,
}: WorkspaceCatalystPanelProps) {
  return (
    <WorkspacePanel title="Catalysts">
      <WorkspaceListStack
        items={catalysts}
        emptyText="No catalysts have been attached to this setup yet."
      />
    </WorkspacePanel>
  );
}