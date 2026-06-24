import { round2 } from "./calculos";
import { resumenCobranza, type FacturaCobranza } from "./finanzas";
import type { CotizacionEstado } from "@/lib/supabase/database.types";

export interface DashboardInput {
  cotizaciones: {
    estado: CotizacionEstado;
    total: number;
    cliente_id: string;
    cliente_nombre: string;
  }[];
  proyectos: { estado: string }[];
  ocs: { estado: string; total: number }[];
  pagos: { monto: number }[];
  facturas: (FacturaCobranza & { tipo: string })[];
}

export interface DashboardKpis {
  cotizaciones: {
    total: number;
    porEstado: Record<string, number>;
    montoConfirmado: number;
  };
  proyectos: { total: number; activos: number };
  compras: { totalOC: number; pagado: number; saldo: number };
  cobranza: { porCobrar: number; cobrado: number; vencido: number };
  topClientes: { cliente_id: string; nombre: string; monto: number }[];
}

export function construirDashboard(
  input: DashboardInput,
  hoyISO: string
): DashboardKpis {
  const porEstado: Record<string, number> = {};
  let montoConfirmado = 0;
  const porCliente = new Map<string, { nombre: string; monto: number }>();

  for (const c of input.cotizaciones) {
    porEstado[c.estado] = (porEstado[c.estado] ?? 0) + 1;
    if (c.estado === "confirmada") {
      montoConfirmado = round2(montoConfirmado + c.total);
      const acc = porCliente.get(c.cliente_id) ?? {
        nombre: c.cliente_nombre,
        monto: 0,
      };
      acc.monto = round2(acc.monto + c.total);
      porCliente.set(c.cliente_id, acc);
    }
  }

  const totalOC = round2(input.ocs.reduce((a, o) => a + o.total, 0));
  const pagado = round2(input.pagos.reduce((a, p) => a + p.monto, 0));

  // Cobranza solo sobre facturas emitidas al cliente
  const cobranza = resumenCobranza(
    input.facturas.filter((f) => f.tipo === "emitida_cliente"),
    hoyISO
  );

  const topClientes = [...porCliente.entries()]
    .map(([cliente_id, v]) => ({ cliente_id, nombre: v.nombre, monto: v.monto }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);

  return {
    cotizaciones: {
      total: input.cotizaciones.length,
      porEstado,
      montoConfirmado,
    },
    proyectos: {
      total: input.proyectos.length,
      activos: input.proyectos.filter((p) => p.estado === "activo").length,
    },
    compras: { totalOC, pagado, saldo: round2(totalOC - pagado) },
    cobranza,
    topClientes,
  };
}

// ============================================================
// Agregaciones para la capa visual (Fase 6). Funciones puras.
// ============================================================

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** Clave YYYY-MM a partir de un ISO. */
function claveMes(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Serie mensual de ingresos confirmados (últimos `meses` meses hasta hoy).
 * Devuelve un punto por mes aunque sea 0, para una gráfica continua.
 */
export function serieMensualIngresos(
  cotizaciones: { estado: CotizacionEstado; total: number; created_at: string }[],
  hoyISO: string,
  meses = 6
): { mes: string; etiqueta: string; monto: number }[] {
  const acc = new Map<string, number>();
  for (const c of cotizaciones) {
    if (c.estado !== "confirmada") continue;
    const k = claveMes(c.created_at);
    acc.set(k, round2((acc.get(k) ?? 0) + c.total));
  }

  const [anio, mes] = hoyISO.slice(0, 7).split("-").map(Number);
  const out: { mes: string; etiqueta: string; monto: number }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    // mes base 1; retrocede i meses
    const d = new Date(Date.UTC(anio, mes - 1 - i, 1));
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({
      mes: k,
      etiqueta: MESES_CORTOS[d.getUTCMonth()],
      monto: acc.get(k) ?? 0,
    });
  }
  return out;
}

export interface EtapaFlujo {
  key: string;
  label: string;
  valor: number;
  /** % de conversión respecto a la etapa anterior (null en la primera). */
  conversion: number | null;
}

export interface EmbudoInput {
  cotizaciones: { estado: CotizacionEstado }[];
  proyectos: { estado: string }[];
  ocs: { estado: string }[];
  pagos: { id: string }[];
  facturas: { tipo: string; estado: string }[];
}

/** Embudo operativo del pipeline JSM (alimenta la cinta "Flujo JSM"). */
export function embudoFlujo(input: EmbudoInput): EtapaFlujo[] {
  const alcanzoCliente = new Set<CotizacionEstado>([
    "enviada_cliente",
    "confirmada",
    "en_negociacion",
  ]);

  const cotizaciones = input.cotizaciones.length;
  const enviadas = input.cotizaciones.filter((c) =>
    alcanzoCliente.has(c.estado)
  ).length;
  const confirmadas = input.cotizaciones.filter(
    (c) => c.estado === "confirmada"
  ).length;
  const proyectos = input.proyectos.length;
  const ordenes = input.ocs.length;
  const pagos = input.pagos.length;
  const cobradas = input.facturas.filter(
    (f) => f.tipo === "emitida_cliente" && f.estado === "pagada"
  ).length;

  const crudo: { key: string; label: string; valor: number }[] = [
    { key: "cotizacion", label: "Cotización", valor: cotizaciones },
    { key: "cliente", label: "Enviada", valor: enviadas },
    { key: "confirmada", label: "Confirmada", valor: confirmadas },
    { key: "proyecto", label: "Proyecto", valor: proyectos },
    { key: "oc", label: "Compra", valor: ordenes },
    { key: "pago", label: "Pago", valor: pagos },
    { key: "cobranza", label: "Cobranza", valor: cobradas },
  ];

  return crudo.map((e, i) => {
    const prev = i > 0 ? crudo[i - 1].valor : null;
    const conversion =
      prev && prev > 0 ? round2((e.valor / prev) * 100) : prev === null ? null : 0;
    return { ...e, conversion };
  });
}

export interface AgingBucket {
  label: string;
  monto: number;
}

/** Antigüedad de saldos por cobrar (facturas a cliente registradas). */
export function agingCobranza(
  facturas: {
    tipo: string;
    estado: string;
    monto: number;
    fecha_vencimiento: string | null;
  }[],
  hoyISO: string
): AgingBucket[] {
  const buckets = { corriente: 0, b1: 0, b2: 0, b3: 0 };
  const hoy = new Date(hoyISO).getTime();
  for (const f of facturas) {
    if (f.tipo !== "emitida_cliente" || f.estado !== "registrada") continue;
    if (!f.fecha_vencimiento) {
      buckets.corriente = round2(buckets.corriente + f.monto);
      continue;
    }
    const dias = Math.floor((hoy - new Date(f.fecha_vencimiento).getTime()) / 86_400_000);
    if (dias <= 0) buckets.corriente = round2(buckets.corriente + f.monto);
    else if (dias <= 30) buckets.b1 = round2(buckets.b1 + f.monto);
    else if (dias <= 60) buckets.b2 = round2(buckets.b2 + f.monto);
    else buckets.b3 = round2(buckets.b3 + f.monto);
  }
  return [
    { label: "Corriente", monto: buckets.corriente },
    { label: "1–30 días", monto: buckets.b1 },
    { label: "31–60 días", monto: buckets.b2 },
    { label: "60+ días", monto: buckets.b3 },
  ];
}
