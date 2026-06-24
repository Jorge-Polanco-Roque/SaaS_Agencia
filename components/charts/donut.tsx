"use client";

import { useMounted } from "./use-reduced-motion";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Dona con leyenda y total al centro; barrido animado. */
export function Donut({
  data,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const mounted = useMounted();
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;

  let acc = 0;
  const segments = data.map((d) => {
    const frac = total > 0 ? d.value / total : 0;
    const seg = { ...d, frac, offset: acc };
    acc += frac;
    return seg;
  });

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-secondary"
            strokeWidth={thickness}
          />
          {total > 0 &&
            segments.map((s, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${c * s.frac} ${c}`}
                strokeDashoffset={mounted ? -c * s.offset : -c}
                style={{
                  transition: `stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1) ${i * 120}ms`,
                }}
                strokeLinecap="butt"
              />
            ))}
        </g>
        {(centerValue || centerLabel) && (
          <text textAnchor="middle">
            <tspan
              x={cx}
              y={cx - 2}
              className="fill-foreground"
              style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
            >
              {centerValue}
            </tspan>
            <tspan x={cx} y={cx + 16} className="fill-muted-foreground" style={{ fontSize: 11 }}>
              {centerLabel}
            </tspan>
          </text>
        )}
      </svg>

      <ul className="space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: d.color }}
            />
            <span className="text-muted-foreground">{d.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
