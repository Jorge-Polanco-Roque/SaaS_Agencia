import { describe, expect, it } from "vitest";
import { detectarAnomalias, diasEntre } from "@/lib/services/control-flujo";
import { seleccionarVencidas } from "@/lib/services/cobranza";

const HOY = "2026-06-23";

describe("diasEntre", () => {
  it("cuenta días entre fechas", () => {
    expect(diasEntre("2026-06-13", HOY)).toBe(10);
  });
});

describe("detectarAnomalias", () => {
  it("detecta cotización sin respuesta, OC pendiente, factura vencida y proyecto sin tareas", () => {
    const alertas = detectarAnomalias(
      {
        cotizaciones: [
          { id: "q1", folio: "COT-1", titulo: "X", estado: "enviada_cliente", enviada_at: "2026-06-10" },
          { id: "q2", folio: "COT-2", titulo: "Y", estado: "enviada_cliente", enviada_at: "2026-06-22" }, // reciente, no alerta
        ],
        ocs: [
          { id: "o1", folio: "OC-1", estado: "autorizada", saldo: 500, autorizada_at: "2026-06-01" },
          { id: "o2", folio: "OC-2", estado: "autorizada", saldo: 0, autorizada_at: "2026-06-01" }, // liquidada
        ],
        facturas: [
          { id: "f1", folio: "F-1", tipo: "emitida_cliente", estado: "registrada", fecha_vencimiento: "2026-06-01" },
          { id: "f2", folio: "F-2", tipo: "emitida_cliente", estado: "pagada", fecha_vencimiento: "2026-06-01" }, // pagada
        ],
        proyectos: [
          { id: "p1", nombre: "Sin tareas", estado: "activo", num_tareas: 0 },
          { id: "p2", nombre: "Con tareas", estado: "activo", num_tareas: 3 },
        ],
      },
      HOY
    );

    const tipos = alertas.map((a) => a.tipo);
    expect(tipos).toContain("cotizacion_sin_respuesta");
    expect(tipos).toContain("oc_pago_pendiente");
    expect(tipos).toContain("factura_vencida");
    expect(tipos).toContain("proyecto_sin_tareas");
    expect(tipos).toHaveLength(4);
    // Orden: 'alta' primero
    expect(alertas[0].nivel).toBe("alta");
  });
});

describe("seleccionarVencidas", () => {
  it("solo facturas a cliente, registradas y vencidas", () => {
    const v = seleccionarVencidas(
      [
        { id: "f1", folio: "F-1", monto: 100, tipo: "emitida_cliente", estado: "registrada", fecha_vencimiento: "2026-06-10" },
        { id: "f2", folio: "F-2", monto: 200, tipo: "emitida_cliente", estado: "pagada", fecha_vencimiento: "2026-06-10" },
        { id: "f3", folio: "F-3", monto: 300, tipo: "recibida_proveedor", estado: "registrada", fecha_vencimiento: "2026-06-10" },
        { id: "f4", folio: "F-4", monto: 400, tipo: "emitida_cliente", estado: "registrada", fecha_vencimiento: "2999-01-01" },
      ],
      HOY
    );
    expect(v.map((x) => x.id)).toEqual(["f1"]);
    expect(v[0].dias).toBe(13);
  });
});
