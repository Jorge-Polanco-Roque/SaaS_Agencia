import { createAdminClient } from "@/lib/supabase/admin";
import { registrarBitacora } from "./bitacora";
import { crearProyectoDesdeCotizacion } from "./proyectos";
import { notificarContabilidad } from "./notificador";
import type { CotizacionExport } from "./cotizacion-export";

/**
 * Acceso del portal del cliente mediante portal_token (omite RLS con service_role).
 * No expone costos ni márgenes: solo lo necesario para revisar y decidir.
 */

export interface PortalVista extends CotizacionExport {
  id: string;
  estado: string;
  puedeDecidir: boolean;
}

export async function getCotizacionPorToken(
  token: string
): Promise<PortalVista | null> {
  const db = createAdminClient();
  const { data: cot } = await db
    .from("cotizaciones")
    .select("*, clientes(nombre, rfc, email)")
    .eq("portal_token", token)
    .maybeSingle();
  if (!cot) return null;

  const cliente = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes;
  const { data: items } = await db
    .from("cotizacion_items")
    .select("descripcion, cantidad, unidad, precio_unitario, importe")
    .eq("cotizacion_id", cot.id)
    .order("orden");

  return {
    id: cot.id,
    estado: cot.estado,
    puedeDecidir: cot.estado === "enviada_cliente",
    folio: cot.folio ?? "—",
    titulo: cot.titulo,
    moneda: cot.moneda,
    fecha: new Date(cot.created_at).toLocaleDateString("es-MX"),
    cliente: {
      nombre: cliente?.nombre ?? "—",
      rfc: cliente?.rfc ?? null,
      email: cliente?.email ?? null,
    },
    items: items ?? [],
    subtotal: cot.subtotal,
    descuento: cot.descuento,
    iva: cot.iva,
    iva_tasa: cot.iva_tasa,
    total: cot.total,
    notas: cot.notas,
  };
}

export type PortalResult = { ok: boolean; error?: string };

export async function confirmarPorToken(token: string): Promise<PortalResult> {
  const db = createAdminClient();
  const { data: cot } = await db
    .from("cotizaciones")
    .select("*")
    .eq("portal_token", token)
    .maybeSingle();
  if (!cot) return { ok: false, error: "Cotización no encontrada" };
  if (cot.estado !== "enviada_cliente" && cot.estado !== "conforme_pendiente") {
    return { ok: false, error: "Esta cotización ya no admite confirmación." };
  }

  const { error } = await db
    .from("cotizaciones")
    .update({ estado: "confirmada", updated_at: new Date().toISOString() })
    .eq("id", cot.id);
  if (error) return { ok: false, error: error.message };

  await registrarBitacora(db, cot.org_id, null, {
    entidad: "cotizacion",
    entidadId: cot.id,
    accion: "confirmar_cliente",
    estadoAnterior: cot.estado,
    estadoNuevo: "confirmada",
    meta: { via: "portal" },
  });

  // Crea el Master de Proyecto + tareas
  await crearProyectoDesdeCotizacion(db, { ...cot, estado: "confirmada" }, null);

  // Flujo JSM: la confirmación (PO CONFIRMA) notifica a Contabilidad.
  await notificarContabilidad(db, cot, "fue confirmada por el cliente (PO CONFIRMA)");

  return { ok: true };
}

export async function solicitarCambiosPorToken(
  token: string,
  motivo: string
): Promise<PortalResult> {
  const db = createAdminClient();
  const { data: cot } = await db
    .from("cotizaciones")
    .select("*")
    .eq("portal_token", token)
    .maybeSingle();
  if (!cot) return { ok: false, error: "Cotización no encontrada" };
  if (cot.estado !== "enviada_cliente" && cot.estado !== "conforme_pendiente") {
    return { ok: false, error: "Esta cotización ya no admite cambios." };
  }

  const { error } = await db
    .from("cotizaciones")
    .update({ estado: "en_negociacion", updated_at: new Date().toISOString() })
    .eq("id", cot.id);
  if (error) return { ok: false, error: error.message };

  await registrarBitacora(db, cot.org_id, null, {
    entidad: "cotizacion",
    entidadId: cot.id,
    accion: "solicitar_cambios",
    estadoAnterior: cot.estado,
    estadoNuevo: "en_negociacion",
    meta: { via: "portal", motivo },
  });

  return { ok: true };
}
