import { describe, expect, it } from "vitest";
import {
  agruparPorColumna,
  aplicarMovimiento,
  reindexar,
  type TareaMinima,
} from "@/lib/services/kanban";

const t = (id: string, columna: TareaMinima["columna"], orden: number): TareaMinima => ({
  id,
  columna,
  orden,
});

describe("agruparPorColumna", () => {
  it("agrupa y ordena por columna", () => {
    const grupos = agruparPorColumna([
      t("a", "por_hacer", 1),
      t("b", "por_hacer", 0),
      t("c", "hecho", 0),
    ]);
    expect(grupos.por_hacer.map((x) => x.id)).toEqual(["b", "a"]);
    expect(grupos.hecho.map((x) => x.id)).toEqual(["c"]);
  });
});

describe("reindexar", () => {
  it("asigna orden secuencial 0..n", () => {
    expect(reindexar(["x", "y", "z"])).toEqual([
      { id: "x", orden: 0 },
      { id: "y", orden: 1 },
      { id: "z", orden: 2 },
    ]);
  });
});

describe("aplicarMovimiento", () => {
  const base = [
    t("a", "por_hacer", 0),
    t("b", "por_hacer", 1),
    t("c", "por_hacer", 2),
  ];

  it("reordena dentro de la misma columna sin huecos", () => {
    const cambios = aplicarMovimiento(base, "c", "por_hacer", 0);
    // c al inicio → c,a,b
    expect(cambios).toEqual([
      { id: "c", columna: "por_hacer", orden: 0 },
      { id: "a", columna: "por_hacer", orden: 1 },
      { id: "b", columna: "por_hacer", orden: 2 },
    ]);
  });

  it("mueve entre columnas y reindexa ambas", () => {
    const cambios = aplicarMovimiento(base, "b", "en_proceso", 0);
    const porHacer = cambios.filter((c) => c.columna === "por_hacer");
    const enProceso = cambios.filter((c) => c.columna === "en_proceso");
    expect(porHacer.map((c) => c.id)).toEqual(["a", "c"]);
    expect(porHacer.map((c) => c.orden)).toEqual([0, 1]);
    expect(enProceso).toEqual([{ id: "b", columna: "en_proceso", orden: 0 }]);
  });

  it("acota la posición fuera de rango", () => {
    const cambios = aplicarMovimiento(base, "a", "por_hacer", 99);
    // a al final → b,c,a
    expect(cambios.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(cambios.map((c) => c.orden)).toEqual([0, 1, 2]);
  });

  it("órdenes siempre únicos y contiguos por columna (invariante)", () => {
    const cambios = aplicarMovimiento(base, "a", "hecho", 0);
    const porColumna: Record<string, number[]> = {};
    for (const c of cambios) {
      (porColumna[c.columna] ??= []).push(c.orden);
    }
    for (const ordenes of Object.values(porColumna)) {
      const sorted = [...ordenes].sort((x, y) => x - y);
      expect(sorted).toEqual(ordenes.map((_, i) => i));
    }
  });

  it("stress: 500 tareas, movimientos repetidos → orden íntegro (gate Fase 2)", () => {
    // 500 tareas distribuidas en las 4 columnas
    const columnas = ["por_hacer", "en_proceso", "bloqueado", "hecho"] as const;
    let tareas: TareaMinima[] = Array.from({ length: 500 }, (_, i) =>
      t(`task-${i}`, columnas[i % 4], Math.floor(i / 4))
    );

    // Aplica 300 movimientos determinísticos y reconstruye el estado
    const aplicar = (
      arr: TareaMinima[],
      cambios: { id: string; columna: TareaMinima["columna"]; orden: number }[]
    ) => {
      const map = new Map(arr.map((x) => [x.id, { ...x }]));
      for (const c of cambios) {
        const it = map.get(c.id)!;
        it.columna = c.columna;
        it.orden = c.orden;
      }
      return [...map.values()];
    };

    for (let i = 0; i < 300; i++) {
      const idx = (i * 7) % tareas.length;
      const destino = columnas[(i * 3) % 4];
      const cambios = aplicarMovimiento(tareas, `task-${idx}`, destino, i % 25);
      tareas = aplicar(tareas, cambios);
    }

    // Invariante final: cada columna tiene orden contiguo 0..n y sin IDs perdidos
    const grupos = agruparPorColumna(tareas);
    let total = 0;
    for (const col of columnas) {
      const ordenes = grupos[col].map((x) => x.orden);
      expect(ordenes).toEqual(grupos[col].map((_, i) => i));
      total += grupos[col].length;
    }
    expect(total).toBe(500);
    expect(new Set(tareas.map((x) => x.id)).size).toBe(500);
  });
});
