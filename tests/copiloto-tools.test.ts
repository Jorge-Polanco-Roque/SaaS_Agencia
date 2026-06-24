import { describe, expect, it } from "vitest";
import { buildTools, HERRAMIENTAS_ESCRITURA } from "@/lib/agents/tools";
import type { SessionUser } from "@/lib/auth/session";
import type { DbClient } from "@/lib/services/db";

// Stub: buildTools solo usa db cuando una herramienta se ejecuta, no al construir.
const db = {} as DbClient;
const user = (rol: SessionUser["rol"]): SessionUser => ({
  id: "u1",
  email: "u@test",
  orgId: "o1",
  nombre: "Test",
  rol,
});

const nombres = (rol: SessionUser["rol"]) =>
  buildTools(db, user(rol)).map((t) => t.name);

describe("buildTools — gating por capacidad", () => {
  it("siempre incluye las herramientas de lectura", () => {
    const n = nombres("contabilidad");
    expect(n).toEqual(
      expect.arrayContaining([
        "buscar_clientes",
        "buscar_catalogo",
        "listar_cotizaciones",
        "resumen_finanzas",
      ])
    );
  });

  it("ejecutivo: puede crear clientes y cotizaciones, no solicitudes de pago", () => {
    const n = nombres("ejecutivo");
    expect(n).toContain("crear_cliente");
    expect(n).toContain("crear_cotizacion");
    expect(n).not.toContain("crear_solicitud_pago");
  });

  it("contabilidad: solicitudes de pago sí; cotizaciones no", () => {
    const n = nombres("contabilidad");
    expect(n).toContain("crear_solicitud_pago");
    expect(n).not.toContain("crear_cotizacion");
  });

  it("cliente (rol externo): ninguna herramienta de escritura", () => {
    const n = nombres("cliente");
    for (const w of HERRAMIENTAS_ESCRITURA) expect(n).not.toContain(w);
  });

  it("super_admin: todas las de escritura", () => {
    const n = nombres("super_admin");
    for (const w of HERRAMIENTAS_ESCRITURA) expect(n).toContain(w);
  });
});
