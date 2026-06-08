import type { ChartBlock } from "@/lib/content";

type Datum = Record<string, unknown>;

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function renderBarChart(spec: Record<string, unknown>): JSX.Element {
  const title = String(spec.title ?? "Chart");
  const data = Array.isArray(spec.data) ? (spec.data as Datum[]) : [];
  const xKey = String(spec.xKey ?? "label");
  const yKey = String(spec.yKey ?? "value");
  const values = data
    .map((row) => {
      const x = String((row as Datum)[xKey] ?? "");
      const y = toNum((row as Datum)[yKey]);
      return { x, y } as { x: string; y: number };
    })
    .filter((item): item is { x: string; y: number } => item.y !== null && item.x.length > 0);

  if (!values.length) {
    return <p className="chart-fallback">No chart data available.</p>;
  }

  const maxY = Math.max(...values.map((item) => item.y));
  const width = 760;
  const height = 280;
  const pad = { left: 70, right: 16, top: 16, bottom: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const bandwidth = values.length ? plotW / values.length : plotW;

  return (
    <figure className="chart-cell__figure" aria-label={title}>
      <figcaption>{title}</figcaption>
      <div className="chart-cell__viewport" role="img" aria-label={title}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${pad.left}, ${pad.top})`}>
            <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="currentColor" strokeWidth={1} />
            <line x1={0} y1={0} x2={0} y2={plotH} stroke="currentColor" strokeWidth={1} />
            {values.map((item, index) => {
              const h = maxY > 0 ? Math.round((item.y / maxY) * plotH) : 0;
              const x = index * bandwidth + bandwidth * 0.12;
              const w = Math.max(bandwidth * 0.76, 12);
              const y = plotH - h;
              return (
                <g key={`${xKey}-${item.x}-${index}`}>
                  <rect x={x} y={y} width={w} height={h} fill="var(--accent)" opacity={0.9} />
                  <text x={x + w / 2} y={plotH + 18} textAnchor="middle" fontSize={11}>
                    {item.x}
                  </text>
                  <text x={x + w / 2} y={Math.max(12, y - 6)} textAnchor="middle" fontSize={11}>
                    {item.y.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </figure>
  );
}

function renderLineChart(spec: Record<string, unknown>): JSX.Element {
  const title = String(spec.title ?? "Chart");
  const data = Array.isArray(spec.data) ? (spec.data as Datum[]) : [];
  const xKey = String(spec.xKey ?? "x");
  const yKey = String(spec.yKey ?? "y");

  const points = data
    .map((row, index) => {
      const x = Number.parseFloat(String((row as Datum)[xKey]));
      const y = toNum((row as Datum)[yKey]);
      return y === null || Number.isNaN(x) ? null : ({ x, y, index } as { x: number; y: number; index: number });
    })
    .filter((point): point is { x: number; y: number; index: number } => point !== null);

  if (!points.length) {
    return <p className="chart-fallback">No chart data available.</p>;
  }

  const width = 760;
  const height = 280;
  const pad = { left: 52, right: 16, top: 16, bottom: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const toXY = (point: { x: number; y: number }): [number, number] => {
    const x = (maxX === minX ? plotW / 2 : ((point.x - minX) / (maxX - minX)) * plotW);
    const y =
      maxY === minY ? plotH / 2 : plotH - ((point.y - minY) / (maxY - minY)) * plotH;
    return [x, y];
  };

  const d = points
    .map((point, index) => {
      const [x, y] = toXY(point);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <figure className="chart-cell__figure" aria-label={title}>
      <figcaption>{title}</figcaption>
      <div className="chart-cell__viewport" role="img" aria-label={title}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${pad.left}, ${pad.top})`}>
            <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="currentColor" strokeWidth={1} />
            <line x1={0} y1={0} x2={0} y2={plotH} stroke="currentColor" strokeWidth={1} />
            <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} />
            {points.map((point) => {
              const [x, y] = toXY(point);
              return <circle key={point.index} cx={x} cy={y} r={3} fill="var(--accent)" />;
            })}
          </g>
        </svg>
      </div>
    </figure>
  );
}

export function ChartCell({ block }: { block: ChartBlock }): JSX.Element {
  const spec = block.spec;
  const type = String(spec.type || spec.chartType || "bar");

  if (type === "line") {
    return renderLineChart(spec);
  }
  return renderBarChart(spec);
}
