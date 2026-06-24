"use client";

import { useId } from "react";
import { useMounted } from "./use-reduced-motion";
import { fmt, type FmtKind } from "./format";

export interface AreaPoint {
  etiqueta: string;
  monto: number;
}

/** Gráfica de área responsiva con degradado, ejes mínimos y animación de trazo. */
export function AreaChart({
  data,
  color = "#3056D3",
  height = 220,
  valueFormat = "moneyShort",
}: {
  data: AreaPoint[];
  color?: string;
  height?: number;
  valueFormat?: FmtKind;
}) {
  const gid = useId();
  const mounted = useMounted();
  const W = 600;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 26;

  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">Sin datos.</p>
    );
  }

  const max = Math.max(...data.map((d) => d.monto), 1);
  const stepX = (W - padL - padR) / Math.max(1, data.length - 1);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const pts = data.map((d, i) => [padL + i * stepX, y(d.monto)] as const);
  const line = pts.map(([x, yy]) => `${x},${yy}`).join(" ");
  const area = `${padL},${H - padB} ${line} ${padL + (data.length - 1) * stepX},${H - padB}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Ingresos por mes"
    >
      <defs>
        <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* líneas guía */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={padL}
          x2={W - padR}
          y1={padT + g * (H - padT - padB)}
          y2={padT + g * (H - padT - padB)}
          stroke="currentColor"
          className="text-border"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}

      <polygon
        points={area}
        fill={`url(#area-${gid})`}
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 700ms ease",
        }}
      />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          strokeDasharray: 1600,
          strokeDashoffset: mounted ? 0 : 1600,
          transition: "stroke-dashoffset 1100ms ease",
        }}
      />
      {pts.map(([x, yy], i) => (
        <g key={i}>
          <circle cx={x} cy={yy} r={3} fill={color} />
          <text
            x={x}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 11 }}
          >
            {data[i].etiqueta}
          </text>
        </g>
      ))}
      {/* valor máximo */}
      <text
        x={padL}
        y={padT - 4}
        className="fill-muted-foreground"
        style={{ fontSize: 10 }}
      >
        {fmt(max, valueFormat)}
      </text>
    </svg>
  );
}
