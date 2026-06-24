import { describe, expect, it } from "vitest";
import {
  calcularDispersion,
  totalDispersion,
} from "@/lib/services/dispersion";
import { round2 } from "@/lib/services/calculos";

describe("calcularDispersion", () => {
  it("reparte en N parcialidades iguales y la suma cuadra exacto", () => {
    const p = calcularDispersion(1000, { parcialidades: 3, fechaInicio: "2026-01-01" });
    expect(p).toHaveLength(3);
    expect(totalDispersion(p)).toBe(1000);
  });

  it("la última parcialidad absorbe el residuo de redondeo", () => {
    // 100 / 3 = 33.33… → 33.33, 33.33, 33.34
    const p = calcularDispersion(100, { parcialidades: 3, fechaInicio: "2026-01-01" });
    expect(p.map((x) => x.monto)).toEqual([33.33, 33.33, 33.34]);
    expect(totalDispersion(p)).toBe(100);
  });

  it("respeta un esquema de porcentajes (anticipo 50/30/20)", () => {
    const p = calcularDispersion(2000, {
      porcentajes: [50, 30, 20],
      fechaInicio: "2026-01-01",
    });
    expect(p.map((x) => x.monto)).toEqual([1000, 600, 400]);
    expect(totalDispersion(p)).toBe(2000);
  });

  it("normaliza porcentajes que no suman 100", () => {
    const p = calcularDispersion(1000, { porcentajes: [1, 1], fechaInicio: "2026-01-01" });
    expect(p.map((x) => x.monto)).toEqual([500, 500]);
    expect(totalDispersion(p)).toBe(1000);
  });

  it("espacia las fechas por diasEntre (dispersión por tiempo)", () => {
    const p = calcularDispersion(300, {
      parcialidades: 3,
      fechaInicio: "2026-01-01",
      diasEntre: 15,
    });
    expect(p.map((x) => x.fecha)).toEqual(["2026-01-01", "2026-01-16", "2026-01-31"]);
  });

  it("monto 0 → parcialidades en 0 sin romper", () => {
    const p = calcularDispersion(0, { parcialidades: 4, fechaInicio: "2026-01-01" });
    expect(totalDispersion(p)).toBe(0);
  });

  // STRESS: integridad de la dispersión en 1000 calendarios variados
  it("stress 1000 calendarios: Σ parcialidades === total sin deriva", () => {
    for (let i = 1; i <= 1000; i++) {
      const total = round2((i * 137.77) % 100000);
      const parcialidades = (i % 12) + 1;
      const p = calcularDispersion(total, {
        parcialidades,
        fechaInicio: "2026-01-01",
        diasEntre: (i % 30) + 1,
      });
      expect(p).toHaveLength(parcialidades);
      expect(totalDispersion(p)).toBe(total);
    }
  });
});
