import { describe, expect, it } from "vitest";
import { accionesOCDisponibles } from "@/lib/services/compras";
import type { OcEstado } from "@/lib/supabase/database.types";

/** Acciones esperadas por estado de la OC (máquina de estados pura). */
const ESPERADO: Record<OcEstado, string[]> = {
  borrador: ["enviar", "cancelar"],
  por_autorizar: ["autorizar", "rechazar", "cancelar"],
  autorizada: ["cerrar", "cancelar"],
  rechazada: ["enviar", "cancelar"],
  cerrada: [],
  cancelada: [],
};

describe("accionesOCDisponibles", () => {
  for (const estado of Object.keys(ESPERADO) as OcEstado[]) {
    it(`desde "${estado}" ofrece ${ESPERADO[estado].join(", ") || "ninguna acción"}`, () => {
      const acciones = accionesOCDisponibles(estado).map((a) => a.accion);
      expect(acciones.sort()).toEqual([...ESPERADO[estado]].sort());
    });
  }

  it("cada acción trae una etiqueta legible", () => {
    for (const a of accionesOCDisponibles("por_autorizar")) {
      expect(a.etiqueta.length).toBeGreaterThan(0);
    }
  });

  it("estados terminales (cerrada/cancelada) no permiten transiciones", () => {
    expect(accionesOCDisponibles("cerrada")).toHaveLength(0);
    expect(accionesOCDisponibles("cancelada")).toHaveLength(0);
  });

  it("una OC rechazada puede reenviarse a autorización", () => {
    const acciones = accionesOCDisponibles("rechazada").map((a) => a.accion);
    expect(acciones).toContain("enviar");
  });
});
