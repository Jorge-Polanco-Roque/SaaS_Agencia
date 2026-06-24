import { describe, expect, it } from "vitest";
import {
  rankearProveedores,
  type ProveedorPull,
} from "@/lib/services/pull-proveedores";

const provs: ProveedorPull[] = [
  { id: "a", nombre: "Rápido", categoria: null, dias_entrega: 2, costo_referencia: 100 },
  { id: "b", nombre: "Barato", categoria: null, dias_entrega: 10, costo_referencia: 40 },
  { id: "c", nombre: "Medio", categoria: null, dias_entrega: 5, costo_referencia: 55 },
];

describe("rankearProveedores", () => {
  it("prioridad tiempo: el de menor dias_entrega primero", () => {
    const r = rankearProveedores(provs, "tiempo");
    expect(r[0].id).toBe("a");
    expect(r[r.length - 1].id).toBe("b");
  });

  it("prioridad costo: el de menor costo primero", () => {
    const r = rankearProveedores(provs, "costo");
    expect(r[0].id).toBe("b");
  });

  it("balance: el intermedio supera a los extremos", () => {
    const r = rankearProveedores(provs, "balance");
    expect(r[0].id).toBe("c");
  });

  it("score en rango 0..100", () => {
    const r = rankearProveedores(provs, "balance");
    for (const p of r) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    }
  });

  it("nulos se penalizan (van al final)", () => {
    const r = rankearProveedores(
      [
        ...provs,
        { id: "z", nombre: "Sin datos", categoria: null, dias_entrega: null, costo_referencia: null },
      ],
      "balance"
    );
    expect(r[r.length - 1].id).toBe("z");
  });
});
