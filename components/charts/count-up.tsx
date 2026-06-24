"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";
import { fmt, type FmtKind } from "./format";

/** Número con animación de conteo y formato configurable (tabular-nums). */
export function CountUp({
  value,
  format = "int",
  durationMs = 900,
  className,
}: {
  value: number;
  format?: FmtKind;
  durationMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, durationMs, reduced]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {fmt(display, format)}
    </span>
  );
}
