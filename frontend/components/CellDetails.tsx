import type { MarkdownBlock } from "@/lib/content";

export function CellDetails({ blocks }: { blocks: MarkdownBlock[] }) {
  const detailBlocks = blocks.filter((block) => block.kind !== "prose");

  if (!detailBlocks.length) {
    return null;
  }

  return (
    <aside className="post-sidebar" aria-label="Cell details">
      <section className="post-sidebar__panel">
        <h2>Cell details</h2>
        <p>Expand code/output entries for on-demand inspection.</p>
        <div className="post-sidebar__list">
          {detailBlocks.map((block, index) => {
            const label = block.kind === "chart" ? `Chart ${index + 1}` : `${block.kind} ${index + 1}`;
            if (block.kind === "python") {
              return (
                <details key={block.id}>
                  <summary>{label}</summary>
                  <pre>{block.source}</pre>
                </details>
              );
            }
            if (block.kind === "output") {
              return (
                <details key={block.id}>
                  <summary>{label}</summary>
                  <pre>{block.output}</pre>
                </details>
              );
            }
            return (
              <details key={block.id}>
                <summary>{label}</summary>
                <pre>{block.raw}</pre>
              </details>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
