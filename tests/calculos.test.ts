import { describe, expect, it } from "vitest";
import {
  calcularTotales,
  costoItem,
  formatMoneda,
  importeItem,
  round2,
} from "@/lib/services/calculos";

describe("formatMoneda", () => {
  it("formatea pesos mexicanos con separador de miles y 2 decimales", () => {
    const s = formatMoneda(1234.5);
    expect(s).toContain("$");
    expect(s).toContain("1,234.50");
  });

  it("formatea el cero", () => {
    expect(formatMoneda(0)).toContain("0.00");
  });

  it("respeta otra moneda", () => {
    expect(formatMoneda(10, "USD")).toContain("10.00");
  });
});

describe("round2", () => {
  it("redondea a 2 decimales sin error de flotante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
  });
});

describe("importeItem", () => {
  it("multiplica cantidad por precio unitario", () => {
    expect(importeItem({ cantidad: 3, costo_unitario: 5, precio_unitario: 10 })).toBe(
      30
    );
  });
});

describe("ítems de personal (rol × personas × días)", () => {
  it("importeItem multiplica personas × días × precio", () => {
    // 3 promotores × 5 días × $1100
    expect(
      importeItem({ cantidad: 3, costo_unitario: 600, precio_unitario: 1100, dias: 5 })
    ).toBe(16500);
  });

  it("costoItem multiplica personas × días × costo", () => {
    expect(
      costoItem({ cantidad: 3, costo_unitario: 600, precio_unitario: 1100, dias: 5 })
    ).toBe(9000);
  });

  it("dias ausente/0/negativo equivale a 1 (retrocompat con productos)", () => {
    expect(importeItem({ cantidad: 2, costo_unitario: 0, precio_unitario: 50 })).toBe(100);
    expect(
      importeItem({ cantidad: 2, costo_unitario: 0, precio_unitario: 50, dias: 0 })
    ).toBe(100);
    expect(
      importeItem({ cantidad: 2, costo_unitario: 0, precio_unitario: 50, dias: -3 })
    ).toBe(100);
  });

  it("cotización de promotoría a 6 meses (≈26 sem) con 3 roles cuadra al centavo", () => {
    // supervisor 1 pers, promotor 4 pers, coordinador 1 pers · 130 días hábiles
    const items = [
      { cantidad: 1, costo_unitario: 950, precio_unitario: 1700, dias: 130 },
      { cantidad: 4, costo_unitario: 600, precio_unitario: 1100, dias: 130 },
      { cantidad: 1, costo_unitario: 1300, precio_unitario: 2300, dias: 130 },
    ];
    const t = calcularTotales(items, { descuento: 0, ivaTasa: 0.16 });
    // subtotal = 1*1700*130 + 4*1100*130 + 1*2300*130 = 221000 + 572000 + 299000
    expect(t.subtotal).toBe(1092000);
    // costo = 1*950*130 + 4*600*130 + 1*1300*130 = 123500 + 312000 + 169000
    expect(t.costo_total).toBe(604500);
    expect(t.margen).toBe(487500);
    expect(t.iva).toBe(round2(1092000 * 0.16));
    expect(t.total).toBe(round2(1092000 * 1.16));
  });

  it("mezcla productos + personal en una misma cotización", () => {
    const items = [
      { cantidad: 100, costo_unitario: 28, precio_unitario: 65 }, // libretas, dias→1
      { cantidad: 2, costo_unitario: 600, precio_unitario: 1100, dias: 10 }, // 2 promotores 10 días
    ];
    const t = calcularTotales(items, {});
    // 100*65 + 2*1100*10 = 6500 + 22000
    expect(t.subtotal).toBe(28500);
    // 100*28 + 2*600*10 = 2800 + 12000
    expect(t.costo_total).toBe(14800);
  });
});

describe("calcularTotales", () => {
  it("calcula subtotal, IVA, total, costo y margen", () => {
    const items = [
      { cantidad: 2, costo_unitario: 40, precio_unitario: 100 }, // importe 200, costo 80
      { cantidad: 1, costo_unitario: 10, precio_unitario: 50 }, // importe 50, costo 10
    ];
    const t = calcularTotales(items, { descuento: 0, ivaTasa: 0.16 });
    expect(t.subtotal).toBe(250);
    expect(t.costo_total).toBe(90);
    expect(t.iva).toBe(40);
    expect(t.total).toBe(290);
    expect(t.margen).toBe(160);
    expect(t.margen_pct).toBe(64);
  });

  it("aplica descuento al subtotal antes de IVA", () => {
    const items = [{ cantidad: 1, costo_unitario: 0, precio_unitario: 100 }];
    const t = calcularTotales(items, { descuento: 20, ivaTasa: 0.16 });
    expect(t.subtotal).toBe(80);
    expect(t.iva).toBe(12.8);
    expect(t.total).toBe(92.8);
  });

  it("no permite subtotal negativo por descuento excesivo", () => {
    const items = [{ cantidad: 1, costo_unitario: 0, precio_unitario: 50 }];
    const t = calcularTotales(items, { descuento: 100, ivaTasa: 0.16 });
    expect(t.subtotal).toBe(0);
    expect(t.total).toBe(0);
  });

  it("margen_pct es 0 cuando el subtotal es 0", () => {
    const t = calcularTotales([], {});
    expect(t.margen_pct).toBe(0);
  });
});
