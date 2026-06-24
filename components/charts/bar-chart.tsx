"use client";

import { useMounted } from "./use-reduced-motion";
import { fmt, type FmtKind } from "./format";

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

/** Barras horizontales con ancho animado. */
export function BarChart({
  data,
  valueFormat = "money",
  color = "#3056D3",
}: {
  data: BarItem[];
  valueFormat?: FmtKind;
  color?: string;
}) {
  const mounted = useMounted();
  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Sin datos.</p>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="truncate font-medium">{d.label}</span>
            <span
              className="ml-2 shrink-0 text-muted-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmt(d.value, valueFormat)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{
                width: mounted ? `${(d.value / max) * 100}%` : "0%",
                background: d.color ?? color,
                transition: `width 800ms cubic-bezier(0.22,1,0.36,1) ${i * 60}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
