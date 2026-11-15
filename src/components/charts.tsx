import { dateLabel, number } from "@/lib/llamita/filters";
export function DailyChart({
  values,
  compact = false,
}: {
  values: { name: string; count: number; label?: string }[];
  compact?: boolean;
}) {
  const max = Math.max(1, ...values.map((v) => v.count));
  const tick = max > 1000 ? 500 : max > 200 ? 100 : max > 50 ? 50 : 10;
  const ceiling = Math.ceil(max / (tick * 4)) * tick * 4;
  const width = compact ? 500 : 1200,
    height = compact ? 220 : 300,
    left = 38,
    bottom = 30,
    top = 24;
  const graphHeight = height - bottom - top;
  const barWidth = (width - left - 12) / Math.max(1, values.length);
  return (
    <div className={`daily-chart ${compact ? "compact" : ""}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Focos por día: ${values.map((v) => `${dateLabel(v.name)}: ${v.count}`).join("; ")}`}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1={left}
              x2={width - 4}
              y1={top + (graphHeight * i) / 4}
              y2={top + (graphHeight * i) / 4}
              stroke="var(--color-borde)"
            />
            <text
              x="2"
              y={top + (graphHeight * i) / 4 + 4}
              fill="var(--color-tinta-suave)"
              fontFamily="var(--font-data)"
              fontSize="11"
            >
              {(ceiling * (4 - i)) / 4}
            </text>
          </g>
        ))}
        {values.map((v, i) => {
          const h = (v.count / ceiling) * graphHeight;
          const x = left + barWidth * i + barWidth * 0.25;
          return (
            <g key={v.name}>
              <title>{`${dateLabel(v.name)}: ${v.count} focos`}</title>
              <rect
                x={x}
                y={top + graphHeight - h}
                width={Math.max(1, barWidth * 0.48)}
                height={h}
                fill={
                  v.count === max
                    ? "var(--color-fuego)"
                    : "var(--color-tinta-suave)"
                }
              />
              {values.length <= 31 && (
                <>
                  <text
                    x={x + barWidth * 0.24}
                    y={top + graphHeight - h - 5}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="var(--font-data)"
                    fill={
                      v.count === max
                        ? "var(--color-fuego-texto)"
                        : "var(--color-tinta-suave)"
                    }
                  >
                    {v.count}
                  </text>
                  <text
                    x={x + barWidth * 0.24}
                    y={height - 11}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="var(--font-data)"
                    fill="var(--color-tinta-suave)"
                  >
                    {v.label || Number(v.name.slice(-2))}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
export function RankingChart({
  values,
  highlight = false,
  max,
}: {
  values: { name: string; count: number }[];
  highlight?: boolean;
  max?: number;
}) {
  const ceiling = max || Math.max(1, ...values.map((v) => v.count));
  return (
    <div className="ranking-chart">
      {values.map((v, i) => (
        <div className="ranking-row" key={v.name}>
          <span>{v.name}</span>
          <div className="ranking-track">
            <div
              style={{
                width: `${(v.count / ceiling) * 100}%`,
                background:
                  highlight && i === 0 ? "var(--color-fuego)" : undefined,
              }}
            />
          </div>
          <span className="mono">{number(v.count)}</span>
        </div>
      ))}
    </div>
  );
}
export function Metrics({
  values,
}: {
  values: { label: string; value: string; description: string }[];
}) {
  return (
    <div className="metrics-grid">
      {values.map((m) => (
        <section className="panel metric" key={m.label}>
          <h2 className="overline">{m.label}</h2>
          <p className="metric-value mono">{m.value}</p>
          <p className="muted">{m.description}</p>
        </section>
      ))}
    </div>
  );
}
