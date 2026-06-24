import { describe, expect, it } from "vitest";
import { calcularLiquidacion } from "@/lib/services/liquidacion";
import { round2 } from "@/lib/services/calculos";

describe("calcularLiquidacion", () => {
  it("compone neto = +anticipo/traspaso − depósito − entrega", () => {
    const r = calcularLiquidacion([
      { concepto: "anticipo", monto: 10000 },
      { concepto: "traspaso", monto: 5000 },
      { concepto: "deposito", monto: 3000 },
      { concepto: "entrega", monto: 2000 },
    ]);
    expect(r.entradas).toBe(15000);
    expect(r.salidas).toBe(5000);
    expect(r.neto).toBe(10000);
  });

  it("agrupa por concepto", () => {
    const r = calcularLiquidacion([
      { concepto: "anticipo", monto: 1000 },
      { concepto: "anticipo", monto: 500 },
      { concepto: "entrega", monto: 200 },
    ]);
    expect(r.porConcepto.anticipo).toBe(1500);
    expect(r.porConcepto.entrega).toBe(200);
  });

  it("ignora conceptos desconocidos o nulos", () => {
    const r = calcularLiquidacion([
      { concepto: "anticipo", monto: 1000 },
      { concepto: null, monto: 999 },
      { concepto: "loquesea", monto: 888 },
    ]);
    expect(r.entradas).toBe(1000);
    expect(r.salidas).toBe(0);
    expect(r.neto).toBe(1000);
  });

  it("sin movimientos → todo 0", () => {
    const r = calcularLiquidacion([]);
    expect(r).toMatchObject({ entradas: 0, salidas: 0, neto: 0 });
  });

  // STRESS: integridad de la composición en 1000 operaciones mixtas
  it("stress 1000 ops: neto === entradas − salidas, sin deriva", () => {
    const conceptos = ["anticipo", "traspaso", "deposito", "entrega", "abono"] as const;
    const movs = Array.from({ length: 1000 }, (_, i) => ({
      concepto: conceptos[i % conceptos.length],
      monto: round2(((i * 73.31) % 9999) + 0.07),
    }));
    const r = calcularLiquidacion(movs);
    expect(r.neto).toBe(round2(r.entradas - r.salidas));
    // El neto también debe coincidir sumando por concepto con su signo
    const recomputado = round2(
      r.porConcepto.anticipo +
        r.porConcepto.traspaso +
        r.porConcepto.abono -
        r.porConcepto.deposito -
        r.porConcepto.entrega
    );
    expect(r.neto).toBe(recomputado);
  });
});
