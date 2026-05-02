type WorkspacePanelProps = {
  title: string;
  children: React.ReactNode;
};

export function WorkspacePanel({ title, children }: WorkspacePanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/3 p-4 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type WorkspaceListStackProps = {
  items: string[] | null | undefined;
  emptyText: string;
};

export function WorkspaceListStack({ items, emptyText }: WorkspaceListStackProps) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-3 py-4 text-sm text-white/45">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 3).map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="rounded-2xl border border-white/10 bg-white/4 px-3 py-3 text-sm leading-6 text-white/75"
        >
          {item}
        </div>
      ))}
    </div>
  );
}