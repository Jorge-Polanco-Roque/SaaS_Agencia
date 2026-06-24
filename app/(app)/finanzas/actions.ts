"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { FacturaSchema, SolicitudPagoSchema } from "@/lib/schemas";
import {
  crearSolicitudPago,
  marcarFacturaCobrada,
  registrarFactura,
  resolverSolicitud,
} from "@/lib/services/compras";

export type ActionState = { ok?: boolean; error?: string };

export async function crearSolicitudPagoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("finanzas.gestionar");
  const parsed = SolicitudPagoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const db = await createClient();
  try {
    await crearSolicitudPago(db, user, parsed.data);
    revalidatePath("/finanzas");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function resolverSolicitudForm(formData: FormData): Promise<void> {
  const user = await requireCapability("pago.autorizar");
  const solicitudId = String(formData.get("solicitud_id"));
  const autorizar = String(formData.get("decision")) === "si";
  const db = await createClient();
  await resolverSolicitud(db, user, solicitudId, autorizar);
  revalidatePath("/finanzas");
}

export async function registrarFacturaClienteAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("finanzas.gestionar");
  const parsed = FacturaSchema.safeParse({
    ...Object.fromEntries(formData),
    tipo: "emitida_cliente",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const db = await createClient();
  try {
    await registrarFactura(db, user, parsed.data);
    revalidatePath("/finanzas");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function cobrarFacturaForm(formData: FormData): Promise<void> {
  const user = await requireCapability("finanzas.gestionar");
  const facturaId = String(formData.get("factura_id"));
  const db = await createClient();
  await marcarFacturaCobrada(db, user, facturaId);
  revalidatePath("/finanzas");
}

export type CobranzaState = {
  ok?: boolean;
  error?: string;
  resumen?: { total: number; enviados: number; simulados: number; fallidos: number; sinContacto: number };
};

export async function ejecutarCobranzaAction(): Promise<CobranzaState> {
  const user = await requireCapability("finanzas.gestionar");
  const db = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  try {
    const { ejecutarCobranza } = await import("@/lib/services/cobranza");
    const resumen = await ejecutarCobranza(db, user.orgId, hoy);
    revalidatePath("/finanzas");
    return { ok: true, resumen };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}
