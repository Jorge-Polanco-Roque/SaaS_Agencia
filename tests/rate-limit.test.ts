import { describe, expect, it, beforeEach } from "vitest";
import { consume, limpiar, _reset } from "@/lib/security/rate-limit";

beforeEach(() => _reset());

describe("rate-limit consume", () => {
  it("permite hasta el límite y luego bloquea", () => {
    const t0 = 1000;
    expect(consume("k", 3, 1000, t0).ok).toBe(true);
    expect(consume("k", 3, 1000, t0).ok).toBe(true);
    const tercero = consume("k", 3, 1000, t0);
    expect(tercero.ok).toBe(true);
    expect(tercero.restantes).toBe(0);
    const cuarto = consume("k", 3, 1000, t0);
    expect(cuarto.ok).toBe(false);
    expect(cuarto.resetEnMs).toBeGreaterThan(0);
  });

  it("reabre tras la ventana", () => {
    const t0 = 0;
    consume("k", 1, 1000, t0);
    expect(consume("k", 1, 1000, t0 + 500).ok).toBe(false);
    expect(consume("k", 1, 1000, t0 + 1001).ok).toBe(true);
  });

  it("claves independientes no se afectan", () => {
    expect(consume("a", 1, 1000, 0).ok).toBe(true);
    expect(consume("b", 1, 1000, 0).ok).toBe(true);
    expect(consume("a", 1, 1000, 0).ok).toBe(false);
  });

  it("limpiar elimina buckets vencidos", () => {
    consume("x", 1, 1000, 0);
    limpiar(2000);
    // tras limpiar, el cupo vuelve a estar disponible
    expect(consume("x", 1, 1000, 2001).ok).toBe(true);
  });
});
