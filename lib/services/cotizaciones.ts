import type { DbClient } from "./db";
import type { SessionUser } from "@/lib/auth/session";
import type {
  Cotizacion,
  CotizacionItem,
  Database,
} from "@/lib/supabase/database.types";

type CotizacionUpdate = Database["public"]["Tables"]["cotizaciones"]["Update"];
import type { CotizacionInput, CotizacionItemInput } from "@/lib/schemas";
import { calcularTotales, importeItem, round2 } from "./calculos";
import { reservarFolio } from "./consecutivo";
import { registrarBitacora } from "./bitacora";
import {
  puedeTransicionar,
  TRANSICIONES,
  type Transicion,
} from "./state-machine";

const SERIE_COTIZACION = "COT";

function filasItems(
  orgId: string,
  cotizacionId: string,
  items: CotizacionItemInput[]
) {
  return items.map((it, i) => ({
    org_id: orgId,
    cotizacion_id: cotizacionId,
    producto_id: it.producto_id ?? null,
    descripcion: it.descripcion,
    cantidad: it.cantidad,
    unidad: it.unidad,
    costo_unitario: it.costo_unitario,
    precio_unitario: it.precio_unitario,
    modalidad: it.modalidad,
    rol: it.rol ?? null,
    dias: it.modalidad === "personal" ? it.dias : 1,
    importe: importeItem(it),
    orden: i,
  }));
}

/** Crea una cotización en estado borrador con sus ítems y totales calculados. */
export async function crearCotizacion(
  db: DbClient,
  user: SessionUser,
  input: CotizacionInput
): Promise<Cotizacion> {
  const totales = calcularTotales(input.items, {
    descuento: input.descuento,
    ivaTasa: input.iva_tasa,
  });

  const { data: cot, error } = await db
    .from("cotizaciones")
    .insert({
      org_id: user.orgId,
      cliente_id: input.cliente_id,
      owner_id: user.id,
      estado: "borrador",
      serie: SERIE_COTIZACION,
      titulo: input.titulo,
      moneda: input.moneda,
      iva_tasa: input.iva_tasa,
      descuento: input.descuento,
      subtotal: totales.subtotal,
      iva: totales.iva,
      total: totales.total,
      costo_total: totales.costo_total,
      margen: totales.margen,
      notas: input.notas ?? null,
    })
    .select()
    .single();

  if (error || !cot) {
    throw new Error(`No se pudo crear la cotización: ${error?.message}`);
  }

  const { error: errItems } = await db
    .from("cotizacion_items")
    .insert(filasItems(user.orgId, cot.id, input.items));
  if (errItems) {
    throw new Error(`No se pudieron guardar los ítems: ${errItems.message}`);
  }

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "cotizacion",
    entidadId: cot.id,
    accion: "crear",
    estadoNuevo: "borrador",
    meta: { titulo: cot.titulo, items: input.items.length },
  });

  return cot;
}

/**
 * Crea una nueva versión de la cotización ("¿Mueve?"): guarda snapshot de la
 * versión actual, reemplaza ítems/datos, recalcula totales y vuelve a borrador.
 */
export async function crearNuevaVersion(
  db: DbClient,
  user: SessionUser,
  cotizacionId: string,
  input: CotizacionInput,
  motivo: string
): Promise<Cotizacion> {
  const { data: actual, error: errGet } = await db
    .from("cotizaciones")
    .select("*")
    .eq("id", cotizacionId)
    .single();
  if (errGet || !actual) throw new Error("Cotización no encontrada");

  const { data: itemsActuales } = await db
    .from("cotizacion_items")
    .select("*")
    .eq("cotizacion_id", cotizacionId);

  // Snapshot de la versión vigente
  await db.from("cotizacion_versiones").insert({
    org_id: user.orgId,
    cotizacion_id: cotizacionId,
    version: actual.version,
    snapshot: { cotizacion: actual, items: itemsActuales ?? [] } as never,
    motivo,
    created_by: user.id,
  });

  const totales = calcularTotales(input.items, {
    descuento: input.descuento,
    ivaTasa: input.iva_tasa,
  });

  const { data: cot, error } = await db
    .from("cotizaciones")
    .update({
      cliente_id: input.cliente_id,
      titulo: input.titulo,
      moneda: input.moneda,
      iva_tasa: input.iva_tasa,
      descuento: input.descuento,
      subtotal: totales.subtotal,
      iva: totales.iva,
      total: totales.total,
      costo_total: totales.costo_total,
      margen: totales.margen,
      notas: input.notas ?? null,
      version: actual.version + 1,
      estado: "borrador",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cotizacionId)
    .select()
    .single();
  if (error || !cot) throw new Error(`No se pudo versionar: ${error?.message}`);

  // Reemplazar ítems
  await db.from("cotizacion_items").delete().eq("cotizacion_id", cotizacionId);
  await db
    .from("cotizacion_items")
    .insert(filasItems(user.orgId, cotizacionId, input.items));

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "cotizacion",
    entidadId: cotizacionId,
    accion: "nueva_version",
    estadoAnterior: actual.estado,
    estadoNuevo: "borrador",
    meta: { version: cot.version, motivo },
  });

  return cot;
}

export interface ResultadoTransicion {
  ok: boolean;
  error?: string;
  cotizacion?: Cotizacion;
}

/** Aplica una transición de estado con sus efectos (folio, timestamps, bitácora). */
export async function transicionar(
  db: DbClient,
  user: SessionUser,
  cotizacionId: string,
  transicion: Transicion,
  opts: { esCliente?: boolean } = {}
): Promise<ResultadoTransicion> {
  const { data: cot, error: errGet } = await db
    .from("cotizaciones")
    .select("*")
    .eq("id", cotizacionId)
    .single();
  if (errGet || !cot) return { ok: false, error: "Cotización no encontrada" };

  const check = puedeTransicionar(cot.estado, transicion, user.rol, opts);
  if (!check.ok) return { ok: false, error: check.motivo };

  const regla = TRANSICIONES[transicion];
  const update: CotizacionUpdate = {
    estado: regla.hacia,
    updated_at: new Date().toISOString(),
  };

  // Efectos colaterales por transición
  if (transicion === "validar" && !cot.folio) {
    const anio = new Date(cot.created_at).getUTCFullYear();
    const folio = await reservarFolio(db, user.orgId, cot.serie, anio);
    update.folio_anio = folio.anio;
    update.folio_num = folio.num;
    update.folio = folio.folio;
    update.validada_por = user.id;
    update.validada_at = new Date().toISOString();
  }
  if (transicion === "enviar_a_cliente") {
    update.enviada_at = new Date().toISOString();
    if (!cot.portal_token) update.portal_token = crypto.randomUUID();
  }

  const { data: actualizada, error } = await db
    .from("cotizaciones")
    .update(update)
    .eq("id", cotizacionId)
    .select()
    .single();
  if (error || !actualizada) {
    return { ok: false, error: `No se pudo actualizar: ${error?.message}` };
  }

  await registrarBitacora(db, user.orgId, user.id, {
    entidad: "cotizacion",
    entidadId: cotizacionId,
    accion: "transicion",
    estadoAnterior: cot.estado,
    estadoNuevo: regla.hacia,
    meta: { transicion, folio: actualizada.folio ?? undefined },
  });

  return { ok: true, cotizacion: actualizada };
}

/** Recalcula el importe de un conjunto de ítems (para detalle/PDF). */
export function totalesDeItems(
  items: Pick<
    CotizacionItem,
    "cantidad" | "costo_unitario" | "precio_unitario" | "dias"
  >[],
  descuento: number,
  ivaTasa: number
) {
  return calcularTotales(
    items.map((i) => ({
      cantidad: i.cantidad,
      costo_unitario: i.costo_unitario,
      precio_unitario: i.precio_unitario,
      dias: i.dias,
    })),
    { descuento, ivaTasa }
  );
}

export { round2 };
