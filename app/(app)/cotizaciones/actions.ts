"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCapability, requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { CotizacionSchema, NuevaVersionSchema } from "@/lib/schemas";
import {
  crearCotizacion,
  crearNuevaVersion,
  transicionar,
} from "@/lib/services/cotizaciones";
import type { Transicion } from "@/lib/services/state-machine";
import { enviarNotificacionTransicion } from "@/lib/services/notificador";

export type FormResult = { ok?: boolean; error?: string; id?: string };

export async function nuevaCotizacionAction(
  input: unknown
): Promise<FormResult> {
  const user = await requireCapability("cotizacion.crear");
  const parsed = CotizacionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const db = await createClient();
  try {
    const cot = await crearCotizacion(db, user, parsed.data);
    revalidatePath("/cotizaciones");
    return { ok: true, id: cot.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function nuevaVersionAction(
  cotizacionId: string,
  input: unknown
): Promise<FormResult> {
  const user = await requireCapability("cotizacion.crear");
  const parsed = NuevaVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const db = await createClient();
  try {
    const { motivo, ...datos } = parsed.data;
    await crearNuevaVersion(db, user, cotizacionId, datos, motivo);
    revalidatePath(`/cotizaciones/${cotizacionId}`);
    return { ok: true, id: cotizacionId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function aplicarTransicionAction(
  cotizacionId: string,
  transicion: Transicion
): Promise<FormResult> {
  const user = await requireSession();
  if (!can(user.rol, "cotizacion.crear") && !can(user.rol, "cotizacion.validar")) {
    return { error: "Sin permiso" };
  }

  const db = await createClient();
  const res = await transicionar(db, user, cotizacionId, transicion);
  if (!res.ok) return { error: res.error };

  // Notificación por email (no bloquea la transición si falla)
  if (res.cotizacion) {
    await enviarNotificacionTransicion(db, res.cotizacion, transicion).catch(
      () => undefined
    );
  }

  revalidatePath(`/cotizaciones/${cotizacionId}`);
  revalidatePath("/cotizaciones");
  return { ok: true };
}

export interface SugerenciaItem {
  producto_id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  precio_unitario: number;
  modalidad: "producto" | "personal";
  rol: string;
  dias: number;
}

export type AsistenteResult =
  | { ok: true; items: SugerenciaItem[]; notas?: string }
  | { ok: false; error: string };

/** Agente Cotizador: propone partidas a partir de un brief en lenguaje natural. */
export async function asistirCotizacionAction(
  brief: string
): Promise<AsistenteResult> {
  await requireCapability("cotizacion.crear");
  if (!brief || brief.trim().length < 5) {
    return { ok: false, error: "Describe brevemente lo que necesita el cliente." };
  }

  const db = await createClient();
  const { data: catalogo } = await db
    .from("productos_servicios")
    .select("id, nombre, descripcion, unidad, costo, precio_publico")
    .eq("activo", true);

  try {
    const { runCotizador } = await import("@/lib/agents/cotizador/graph");
    const res = await runCotizador(brief, catalogo ?? []);
    const validIds = new Set((catalogo ?? []).map((c) => c.id));
    const items: SugerenciaItem[] = res.items.map((it) => ({
      producto_id:
        it.producto_id && validIds.has(it.producto_id) ? it.producto_id : "",
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      unidad: it.unidad,
      costo_unitario: it.costo_unitario,
      precio_unitario: it.precio_unitario,
      modalidad: "producto",
      rol: "",
      dias: 1,
    }));
    return { ok: true, items, notas: res.notas };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error del asistente",
    };
  }
}

/** Variante para usar con <form action>: lee del FormData y redirige. */
export async function transicionFormAction(formData: FormData): Promise<void> {
  const cotizacionId = String(formData.get("cotizacion_id"));
  const transicion = String(formData.get("transicion")) as Transicion;
  await aplicarTransicionAction(cotizacionId, transicion);
  redirect(`/cotizaciones/${cotizacionId}`);
}
