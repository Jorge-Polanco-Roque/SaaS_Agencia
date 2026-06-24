import { describe, expect, it } from "vitest";
import { can, CAPABILITIES, ROLE_LABELS } from "@/lib/auth/rbac";
import { NAV_ITEMS } from "@/lib/nav";
import type { AppRole } from "@/lib/supabase/database.types";

const ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "ejecutivo",
  "operaciones",
  "compras_finanzas",
  "contabilidad",
  "cliente",
];

describe("can", () => {
  it("sin rol (null/undefined) niega todo", () => {
    expect(can(null, "cotizacion.crear")).toBe(false);
    expect(can(undefined, "admin.config")).toBe(false);
  });

  it("ejecutivo puede crear cotizaciones pero no validarlas", () => {
    expect(can("ejecutivo", "cotizacion.crear")).toBe(true);
    expect(can("ejecutivo", "cotizacion.validar")).toBe(false);
  });

  it("solo super_admin/admin validan cotizaciones", () => {
    expect(can("admin", "cotizacion.validar")).toBe(true);
    expect(can("super_admin", "cotizacion.validar")).toBe(true);
    expect(can("operaciones", "cotizacion.validar")).toBe(false);
  });

  it("autorizar pagos restringido a super_admin/admin/contabilidad", () => {
    expect(can("contabilidad", "pago.autorizar")).toBe(true);
    expect(can("admin", "pago.autorizar")).toBe(true);
    expect(can("ejecutivo", "pago.autorizar")).toBe(false);
    expect(can("compras_finanzas", "pago.autorizar")).toBe(false);
  });

  it("el rol cliente NO tiene ninguna capacidad interna", () => {
    for (const cap of Object.keys(CAPABILITIES) as (keyof typeof CAPABILITIES)[]) {
      expect(can("cliente", cap)).toBe(false);
    }
  });

  it("super_admin tiene TODAS las capacidades", () => {
    for (const cap of Object.keys(CAPABILITIES) as (keyof typeof CAPABILITIES)[]) {
      expect(can("super_admin", cap)).toBe(true);
    }
  });

  it("nunca expone costos al cliente", () => {
    expect(can("cliente", "cotizacion.ver_costos")).toBe(false);
  });
});

describe("ROLE_LABELS", () => {
  it("tiene etiqueta para cada rol", () => {
    for (const rol of ROLES) {
      expect(ROLE_LABELS[rol]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("NAV_ITEMS", () => {
  it("toda capacidad declarada en nav existe en CAPABILITIES", () => {
    for (const item of NAV_ITEMS) {
      if (item.cap) expect(item.cap in CAPABILITIES).toBe(true);
    }
  });

  it("el cliente no ve ningún ítem que requiera capacidad interna", () => {
    const visibles = NAV_ITEMS.filter((i) => !i.cap || can("cliente", i.cap));
    // Solo quedan los ítems sin capacidad (ej. Panel)
    expect(visibles.every((i) => !i.cap)).toBe(true);
  });

  it("operaciones ve Catálogo y Compras pero no Administración", () => {
    const labels = NAV_ITEMS.filter((i) => !i.cap || can("operaciones", i.cap)).map(
      (i) => i.label
    );
    expect(labels).toContain("Catálogo");
    expect(labels).toContain("Compras");
    expect(labels).not.toContain("Administración");
  });
});
