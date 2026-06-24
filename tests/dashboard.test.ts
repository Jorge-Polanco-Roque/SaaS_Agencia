import { describe, expect, it } from "vitest";
import {
  agingCobranza,
  construirDashboard,
  embudoFlujo,
  serieMensualIngresos,
} from "@/lib/services/dashboard";

describe("construirDashboard", () => {
  it("agrega KPIs y cruza top clientes por monto confirmado", () => {
    const kpis = construirDashboard(
      {
        cotizaciones: [
          { estado: "confirmada", total: 1000, cliente_id: "c1", cliente_nombre: "Acme" },
          { estado: "confirmada", total: 500, cliente_id: "c1", cliente_nombre: "Acme" },
          { estado: "confirmada", total: 800, cliente_id: "c2", cliente_nombre: "Beta" },
          { estado: "borrador", total: 999, cliente_id: "c3", cliente_nombre: "Gamma" },
        ],
        proyectos: [{ estado: "activo" }, { estado: "cerrado" }],
        ocs: [{ estado: "autorizada", total: 600 }],
        pagos: [{ monto: 200 }],
        facturas: [
          { tipo: "emitida_cliente", estado: "registrada", monto: 300, fecha_vencimiento: "2999-01-01" },
        ],
      },
      "2026-06-23"
    );

    expect(kpis.cotizaciones.total).toBe(4);
    expect(kpis.cotizaciones.montoConfirmado).toBe(2300);
    expect(kpis.cotizaciones.porEstado.confirmada).toBe(3);
    expect(kpis.proyectos.activos).toBe(1);
    expect(kpis.compras.totalOC).toBe(600);
    expect(kpis.compras.saldo).toBe(400);
    expect(kpis.cobranza.porCobrar).toBe(300);
    // Acme (1500) por encima de Beta (800)
    expect(kpis.topClientes[0]).toMatchObject({ nombre: "Acme", monto: 1500 });
    expect(kpis.topClientes[1]).toMatchObject({ nombre: "Beta", monto: 800 });
  });
});

describe("serieMensualIngresos", () => {
  it("agrupa confirmadas por mes y rellena meses vacíos", () => {
    const serie = serieMensualIngresos(
      [
        { estado: "confirmada", total: 1000, created_at: "2026-06-10T00:00:00Z" },
        { estado: "confirmada", total: 500, created_at: "2026-06-20T00:00:00Z" },
        { estado: "confirmada", total: 300, created_at: "2026-04-05T00:00:00Z" },
        { estado: "borrador", total: 999, created_at: "2026-06-01T00:00:00Z" },
      ],
      "2026-06-23",
      6
    );
    expect(serie).toHaveLength(6);
    expect(serie[serie.length - 1]).toMatchObject({ etiqueta: "jun", monto: 1500 });
    expect(serie.find((p) => p.mes === "2026-04")?.monto).toBe(300);
    expect(serie.find((p) => p.mes === "2026-05")?.monto).toBe(0);
  });
});

describe("embudoFlujo", () => {
  it("calcula etapas y conversión entre ellas", () => {
    const etapas = embudoFlujo({
      cotizaciones: [
        { estado: "confirmada" },
        { estado: "enviada_cliente" },
        { estado: "borrador" },
        { estado: "confirmada" },
      ],
      proyectos: [{ estado: "activo" }, { estado: "activo" }],
      ocs: [{ estado: "autorizada" }],
      pagos: [{ id: "p1" }],
      facturas: [
        { tipo: "emitida_cliente", estado: "pagada" },
        { tipo: "emitida_cliente", estado: "registrada" },
      ],
    });
    const byKey = Object.fromEntries(etapas.map((e) => [e.key, e]));
    expect(byKey.cotizacion.valor).toBe(4);
    expect(byKey.cotizacion.conversion).toBeNull();
    expect(byKey.cliente.valor).toBe(3); // 2 confirmadas + 1 enviada
    expect(byKey.confirmada.valor).toBe(2);
    expect(byKey.confirmada.conversion).toBeCloseTo((2 / 3) * 100, 1);
    expect(byKey.cobranza.valor).toBe(1);
  });
});

describe("agingCobranza", () => {
  it("clasifica saldos por antigüedad", () => {
    const buckets = agingCobranza(
      [
        { tipo: "emitida_cliente", estado: "registrada", monto: 100, fecha_vencimiento: "2999-01-01" }, // corriente
        { tipo: "emitida_cliente", estado: "registrada", monto: 200, fecha_vencimiento: "2026-06-10" }, // 13 días → 1-30
        { tipo: "emitida_cliente", estado: "registrada", monto: 300, fecha_vencimiento: "2026-05-10" }, // ~44 → 31-60
        { tipo: "emitida_cliente", estado: "registrada", monto: 400, fecha_vencimiento: "2026-01-01" }, // >60
        { tipo: "emitida_cliente", estado: "pagada", monto: 999, fecha_vencimiento: "2026-01-01" }, // ignorada
      ],
      "2026-06-23"
    );
    expect(buckets.map((b) => b.monto)).toEqual([100, 200, 300, 400]);
  });
});
