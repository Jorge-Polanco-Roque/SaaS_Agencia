"use client";

import { useMounted } from "./use-reduced-motion";

/** Anillo de progreso con porcentaje al centro. */
export function ProgressRing({
  value,
  max = 100,
  size = 96,
  thickness = 10,
  color = "#2A4BD7",
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: string;
}) {
  const mounted = useMounted();
  const frac = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const pct = Math.round(frac * 100);

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={label}>
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
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={mounted ? c * (1 - frac) : c}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </g>
        <text
          x={cx}
          y={cx + 5}
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: size * 0.24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
        >
          {pct}%
        </text>
      </svg>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
