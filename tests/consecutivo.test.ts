import { describe, expect, it } from "vitest";
import { formatFolio } from "@/lib/services/consecutivo";

describe("formatFolio", () => {
  it("formatea serie-año-número con 5 dígitos", () => {
    expect(formatFolio("COT", 2026, 7)).toBe("COT-2026-00007");
  });

  it("no recorta números de más de 5 dígitos", () => {
    expect(formatFolio("OC", 2026, 123456)).toBe("OC-2026-123456");
  });

  it("rellena el cero inicial en el número 1", () => {
    expect(formatFolio("COT", 2026, 1)).toBe("COT-2026-00001");
  });

  it("respeta distintas series", () => {
    expect(formatFolio("OC", 2025, 42)).toBe("OC-2025-00042");
  });
});
