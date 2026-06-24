"use client";

import { CountUp } from "./count-up";
import { useMounted } from "./use-reduced-motion";
import { cn } from "@/lib/utils";

export interface EtapaFlujo {
  key: string;
  label: string;
  valor: number;
  conversion: number | null;
}

/**
 * "Flujo JSM" — elemento firma. Pipeline operativo (Cotización → … → Cobranza)
 * con conteos y % de conversión, relleno animado al cargar.
 */
export function FlujoRibbon({ etapas }: { etapas: EtapaFlujo[] }) {
  const mounted = useMounted();
  const maxVal = Math.max(...etapas.map((e) => e.valor), 1);

  return (
    <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
      {etapas.map((e, i) => (
        <div key={e.key} className="flex items-stretch gap-1">
          <div className="flex min-w-[112px] flex-1 flex-col rounded-lg border bg-card p-3">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {e.label}
            </span>
            <CountUp
              value={e.valor}
              className="my-1 text-2xl font-bold leading-none"
            />
            {/* barra proporcional */}
            <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${(e.valor / maxVal) * 100}%` : "0%",
                  background:
                    "linear-gradient(90deg,#2A4BD7,#7C3AED)",
                  transition: `width 900ms cubic-bezier(0.22,1,0.36,1) ${i * 90}ms`,
                }}
              />
            </div>
          </div>

          {i < etapas.length - 1 && (
            <div className="flex w-9 shrink-0 flex-col items-center justify-center">
              <span className="text-muted-foreground">→</span>
              {etapas[i + 1].conversion != null && (
                <span
                  className={cn(
                    "text-[0.62rem] font-bold tabular-nums",
                    (etapas[i + 1].conversion ?? 0) >= 50
                      ? "text-emerald-600"
                      : "text-amber-600"
                  )}
                >
                  {etapas[i + 1].conversion}%
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
