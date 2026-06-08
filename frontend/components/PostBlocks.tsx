import ReactMarkdown from "react-markdown";

import { ChartCell } from "@/components/ChartCell";
import type { MarkdownBlock } from "@/lib/content";

function CodeCell({ source, language }: { source: string; language: string }) {
  return (
    <details className="cell cell--collapsed">
      <summary>{language} cell</summary>
      <pre>
        <code>{source}</code>
      </pre>
    </details>
  );
}

function OutputCell({ output }: { output: string }) {
  return (
    <details className="cell cell--collapsed">
      <summary>Output</summary>
      <pre>{output}</pre>
    </details>
  );
}

export function PostBlocks({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <div className="post-content">
      {blocks.map((block) => {
        if (block.kind === "prose") {
          return (
            <ReactMarkdown
              key={block.id}
              className="prose-proxy"
              components={{
                a: ({ node: _node, ...props }) => <a target="_self" rel="noreferrer" {...props} />,
              }}
            >
              {block.markdown}
            </ReactMarkdown>
          );
        }
        if (block.kind === "python") {
          return <CodeCell key={block.id} source={block.source} language="python" />;
        }
        if (block.kind === "output") {
          return <OutputCell key={block.id} output={block.output} />;
        }
        if (block.kind === "chart") {
          return <ChartCell key={block.id} block={block} />;
        }
        return null;
      })}
    </div>
  );
}
