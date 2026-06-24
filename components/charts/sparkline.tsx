"use client";

import { useId } from "react";

/** Mini-tendencia (área + línea) sin ejes, para tarjetas KPI. */
export function Sparkline({
  data,
  color = "#3056D3",
  width = 120,
  height = 36,
  className,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const gid = useId();
  if (!data.length) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pad = 2;
  const stepX = (width - pad * 2) / Math.max(1, data.length - 1);
  const y = (v: number) =>
    height - pad - ((v - min) / span) * (height - pad * 2);
  const pts = data.map((v, i) => [pad + i * stepX, y(v)] as const);
  const line = pts.map(([x, yy]) => `${x},${yy}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${pad + (data.length - 1) * stepX},${height - pad}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spark-${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
