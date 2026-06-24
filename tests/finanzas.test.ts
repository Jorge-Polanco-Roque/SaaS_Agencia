import { describe, expect, it } from "vitest";
import {
  importeOC,
  resumenCobranza,
  resumenPagos,
  totalesOrdenCompra,
} from "@/lib/services/finanzas";
import { round2 } from "@/lib/services/calculos";

describe("totalesOrdenCompra", () => {
  it("suma costos y aplica IVA", () => {
    const t = totalesOrdenCompra(
      [
        { cantidad: 10, costo_unitario: 85 },
        { cantidad: 5, costo_unitario: 28 },
      ],
      0.16
    );
    expect(t.subtotal).toBe(990);
    expect(t.iva).toBe(158.4);
    expect(t.total).toBe(1148.4);
  });

  it("IVA por defecto 16% cuando no se especifica", () => {
    const t = totalesOrdenCompra([{ cantidad: 1, costo_unitario: 100 }]);
    expect(t.iva).toBe(16);
    expect(t.total).toBe(116);
  });

  it("lista vacía → todo en cero", () => {
    expect(totalesOrdenCompra([])).toEqual({ subtotal: 0, iva: 0, total: 0 });
  });
});

describe("importeOC", () => {
  it("multiplica cantidad por costo unitario", () => {
    expect(importeOC({ cantidad: 7, costo_unitario: 12.5 })).toBe(87.5);
  });
});

describe("resumenPagos", () => {
  it("invariante: pagado + saldo === total", () => {
    const r = resumenPagos(1000, [{ monto: 300 }, { monto: 250.5 }]);
    expect(r.pagado).toBe(550.5);
    expect(r.saldo).toBe(449.5);
    expect(round2(r.pagado + r.saldo)).toBe(1000);
    expect(r.liquidado).toBe(false);
  });

  it("detecta liquidado y sobrepago", () => {
    expect(resumenPagos(100, [{ monto: 100 }]).liquidado).toBe(true);
    expect(resumenPagos(100, [{ monto: 120 }]).sobrepagado).toBe(true);
  });

  it("stress: 1000 operaciones cuadran sin deriva (gate Fase 3)", () => {
    // 1000 pagos con centavos variados → la suma debe cuadrar exacto
    const pagos = Array.from({ length: 1000 }, (_, i) => ({
      monto: round2(10 + (i % 97) * 0.01 + (i % 7) * 1.13),
    }));
    const total = round2(pagos.reduce((a, p) => a + p.monto, 0));

    const r = resumenPagos(total, pagos);
    expect(r.pagado).toBe(total);
    expect(r.saldo).toBe(0);
    expect(round2(r.pagado + r.saldo)).toBe(total);
    expect(r.liquidado).toBe(true);
    expect(r.sobrepagado).toBe(false);
  });

  it("stress: saldo parcial exacto sobre 1000 abonos", () => {
    const pagos = Array.from({ length: 1000 }, () => ({ monto: 1.1 }));
    const r = resumenPagos(2000, pagos);
    expect(r.pagado).toBe(1100);
    expect(r.saldo).toBe(900);
    expect(round2(r.pagado + r.saldo)).toBe(2000);
  });
});

describe("resumenCobranza", () => {
  it("clasifica por cobrar, cobrado y vencido", () => {
    const r = resumenCobranza(
      [
        { monto: 1000, estado: "registrada", fecha_vencimiento: "2026-01-01" }, // vencida
        { monto: 500, estado: "registrada", fecha_vencimiento: "2999-01-01" }, // vigente
        { monto: 700, estado: "pagada", fecha_vencimiento: "2026-01-01" }, // cobrada
        { monto: 300, estado: "cancelada", fecha_vencimiento: null }, // ignorada
      ],
      "2026-06-23"
    );
    expect(r.porCobrar).toBe(1500);
    expect(r.cobrado).toBe(700);
    expect(r.vencido).toBe(1000);
  });
});
