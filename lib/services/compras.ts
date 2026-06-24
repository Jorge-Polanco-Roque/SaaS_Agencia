import type { DbClient } from "./db";
import type { SessionUser } from "@/lib/auth/session";
import type { OcEstado, OrdenCompra } from "@/lib/supabase/database.types";
import type {
  FacturaInput,
  OrdenCompraInput,
  PagoInput,
  SolicitudPagoInput,
} from "@/lib/schemas";
import { importeOC, totalesOrdenCompra } from "./finanzas";
import { reservarFolio } from "./consecutivo";
import { registrarBitacora } from "./bitacora";
import { calcularDispersion, type OpcionesDispersion } from "./dispersion";

// ---------- Máquina de estados de la OC ----------
export type AccionOC = "enviar" | "autorizar" | "rechazar" | "cerrar" | "cancelar";

const OC_TRANSICIONES: Record<
  AccionOC,
  { desde: OcEstado[]; hacia: OcEstado; etiqueta: string }
> = {
  enviar: { desde: ["borrador", "rechazada"], hacia: "por_autorizar", etiqueta: "Enviar a autorización" },
  autorizar: { desde: ["por_autorizar"], hacia: "autorizada", etiqueta: "Autorizar (asigna folio)" },
  rechazar: { desde: ["por_autorizar"], hacia: "rechazada", etiqueta: "Rechazar" },
  cerrar: { desde: ["autorizada"], hacia: "cerrada", etiqueta: "Cerrar" },
  cancelar: {
    desde: ["borrador", "por_autorizar", "autorizada", "rechazada"],
    hacia: "cancelada",
    etiqueta: "Cancelar",
  },
};

export function accionesOCDisponibles(estado: OcEstado): {
  accion: AccionOC;
  etiqueta: string;
}[] {
  return (Object.keys(OC_TRANSICIONES) as AccionOC[])
    .filter((a) => OC_TRANSICIONES[a].desde.includes(estado))
    .map((a) => ({ accion: a, etiqueta: OC_TRANSICIONES[a].etiqueta }));
}

/** Crea una orden de compra en borrador con sus ítems y totales. */
export async function crearOrdenCompra(
  db: DbClient,
  user: SessionUser,
  input: OrdenCompraInput
): Promise<OrdenCompra> {
  const totales = totalesOrdenCompra(
    input.items.map((i) => ({ cantidad: i.cantidad, costo_unitario: i.costo_unitario })),
    input.iva_tasa
  );

  const { data: oc, error } = await db
    .from("ordenes_compra")
    .insert({
      org_id: user.orgId,
      proyecto_id: input.proyecto_id ?? null,
      proveedor_id: input.proveedor_id,
      iva_tasa: input.iva_tasa,
      subtotal: totales.subtotal,
      iva: totales.iva,
      total: totales.total,
      notas: input.notas ?? null,
      created_by: user.id,
    })
    .select()
    .single();
  if (error || !oc) throw new Error(`No se pudo crear la OC: ${error?.message}`);

  await db.from("orden_compra_items").insert(
    input.items.map((it, i) => ({
      org_id: user.orgId,
      orden_compra_id: oc.id,
      producto_id: it.producto_id ?? null,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      unidad: it.unidad,
      costo_unitario: it.costo_unitario,
      importe: importeOC(it),
      orden: i,
    }))
  );

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "orden_compra",
    entidadId: oc.id,
    accion: "crear",
    estadoNuevo: "borrador",
    meta: { total: oc.total },
  });

  return oc;
}

export interface ResultadoOC {
  ok: boolean;
  error?: string;
  oc?: OrdenCompra;
}

export async function transicionarOC(
  db: DbClient,
  user: SessionUser,
  ocId: string,
  accion: AccionOC
): Promise<ResultadoOC> {
  const { data: oc } = await db
    .from("ordenes_compra")
    .select("*")
    .eq("id", ocId)
    .single();
  if (!oc) return { ok: false, error: "OC no encontrada" };

  const regla = OC_TRANSICIONES[accion];
  if (!regla.desde.includes(oc.estado)) {
    return { ok: false, error: `No se puede "${regla.etiqueta}" desde ${oc.estado}` };
  }

  const update: Database_OCUpdate = {
    estado: regla.hacia,
    updated_at: new Date().toISOString(),
  };
  if (accion === "autorizar" && !oc.folio) {
    const anio = new Date(oc.created_at).getUTCFullYear();
    const folio = await reservarFolio(db, user.orgId, oc.serie, anio);
    update.folio_anio = folio.anio;
    update.folio_num = folio.num;
    update.folio = folio.folio;
    update.autorizada_por = user.id;
    update.autorizada_at = new Date().toISOString();
  }

  const { data: actualizada, error } = await db
    .from("ordenes_compra")
    .update(update)
    .eq("id", ocId)
    .select()
    .single();
  if (error || !actualizada) {
    return { ok: false, error: `No se pudo actualizar: ${error?.message}` };
  }

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "orden_compra",
    entidadId: ocId,
    accion: "transicion",
    estadoAnterior: oc.estado,
    estadoNuevo: regla.hacia,
    meta: { accion, folio: actualizada.folio ?? undefined },
  });

  return { ok: true, oc: actualizada };
}

// ---------- Solicitudes de pago ----------
export async function crearSolicitudPago(
  db: DbClient,
  user: SessionUser,
  input: SolicitudPagoInput
): Promise<void> {
  const { error } = await db.from("solicitudes_pago").insert({
    org_id: user.orgId,
    proyecto_id: input.proyecto_id ?? null,
    orden_compra_id: input.orden_compra_id ?? null,
    proveedor_id: input.proveedor_id ?? null,
    concepto: input.concepto,
    tipo: input.tipo,
    monto: input.monto,
    fecha_requerida: input.fecha_requerida ?? null,
    solicitado_por: user.id,
  });
  if (error) throw new Error(error.message);
}

/**
 * Programa la dispersión "Tiempo × días" de una OC: genera N solicitudes de pago
 * a partir del calendario (Σ = monto), una por parcialidad. Flujo JSM Operaciones.
 */
export async function programarDispersion(
  db: DbClient,
  user: SessionUser,
  args: {
    orden_compra_id: string;
    proveedor_id?: string | null;
    proyecto_id?: string | null;
    montoTotal: number;
    opciones?: OpcionesDispersion;
  }
): Promise<{ parcialidades: number; total: number }> {
  const calendario = calcularDispersion(args.montoTotal, {
    etiqueta: "Dispersión",
    ...args.opciones,
  });

  const filas = calendario.map((p) => ({
    org_id: user.orgId,
    proyecto_id: args.proyecto_id ?? null,
    orden_compra_id: args.orden_compra_id,
    proveedor_id: args.proveedor_id ?? null,
    concepto: p.concepto,
    tipo: "pago_unico" as const,
    monto: p.monto,
    fecha_requerida: p.fecha,
    solicitado_por: user.id,
  }));

  const { error } = await db.from("solicitudes_pago").insert(filas);
  if (error) throw new Error(error.message);

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "orden_compra",
    entidadId: args.orden_compra_id,
    accion: "programar_dispersion",
    meta: { parcialidades: calendario.length, total: args.montoTotal },
  });

  const total = calendario.reduce((a, p) => a + p.monto, 0);
  return { parcialidades: calendario.length, total };
}

export async function resolverSolicitud(
  db: DbClient,
  user: SessionUser,
  solicitudId: string,
  autorizar: boolean
): Promise<void> {
  await db
    .from("solicitudes_pago")
    .update({
      estado: autorizar ? "autorizada" : "rechazada",
      autorizado_por: user.id,
      autorizado_at: new Date().toISOString(),
    })
    .eq("id", solicitudId);

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "solicitud_pago",
    entidadId: solicitudId,
    accion: autorizar ? "autorizar" : "rechazar",
    estadoNuevo: autorizar ? "autorizada" : "rechazada",
  });
}

// ---------- Pagos ----------
export async function registrarPago(
  db: DbClient,
  user: SessionUser,
  input: PagoInput,
  ctx: { proyectoId?: string | null; proveedorId?: string | null }
): Promise<void> {
  const { error } = await db.from("pagos").insert({
    org_id: user.orgId,
    solicitud_pago_id: input.solicitud_pago_id ?? null,
    orden_compra_id: input.orden_compra_id ?? null,
    proyecto_id: ctx.proyectoId ?? null,
    proveedor_id: ctx.proveedorId ?? null,
    tipo: input.tipo,
    concepto: input.concepto ?? null,
    monto: input.monto,
    metodo: input.metodo ?? null,
    referencia: input.referencia ?? null,
    comprobante_url: input.comprobante_url ?? null,
    fecha: input.fecha ?? new Date().toISOString().slice(0, 10),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  if (input.solicitud_pago_id) {
    await db
      .from("solicitudes_pago")
      .update({ estado: "pagada" })
      .eq("id", input.solicitud_pago_id);
  }

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "pago",
    entidadId: input.orden_compra_id ?? input.solicitud_pago_id ?? user.orgId,
    accion: "registrar_pago",
    meta: { monto: input.monto, tipo: input.tipo },
  });
}

// ---------- Facturas (registro, sin timbrar) ----------
export async function registrarFactura(
  db: DbClient,
  user: SessionUser,
  input: FacturaInput
): Promise<void> {
  const { error } = await db.from("facturas").insert({
    org_id: user.orgId,
    tipo: input.tipo,
    proyecto_id: input.proyecto_id ?? null,
    orden_compra_id: input.orden_compra_id ?? null,
    cliente_id: input.cliente_id ?? null,
    proveedor_id: input.proveedor_id ?? null,
    folio: input.folio,
    uuid_sat: input.uuid_sat ?? null,
    monto: input.monto,
    fecha_emision: input.fecha_emision ?? new Date().toISOString().slice(0, 10),
    fecha_vencimiento: input.fecha_vencimiento ?? null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "factura",
    entidadId: input.orden_compra_id ?? input.proyecto_id ?? user.orgId,
    accion: "registrar_factura",
    meta: { folio: input.folio, tipo: input.tipo, monto: input.monto },
  });
}

export async function marcarFacturaCobrada(
  db: DbClient,
  user: SessionUser,
  facturaId: string
): Promise<void> {
  await db
    .from("facturas")
    .update({ estado: "pagada", cobrada_at: new Date().toISOString() })
    .eq("id", facturaId);
  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "factura",
    entidadId: facturaId,
    accion: "cobrar",
    estadoNuevo: "pagada",
  });
}

// Tipo auxiliar (evita importar el namespace Database completo aquí)
type Database_OCUpdate = {
  estado?: OcEstado;
  updated_at?: string;
  folio_anio?: number | null;
  folio_num?: number | null;
  folio?: string | null;
  autorizada_por?: string | null;
  autorizada_at?: string | null;
};
