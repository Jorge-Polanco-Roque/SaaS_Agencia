"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import {
  MovimientoSchema,
  ProyectoUpdateSchema,
  TareaSchema,
} from "@/lib/schemas";
import {
  actualizarTarea,
  crearTarea,
  eliminarTarea,
  moverTarea,
} from "@/lib/services/proyectos";
import type { TareaColumna } from "@/lib/supabase/database.types";

export type ActionState = { ok?: boolean; error?: string };

export async function crearTareaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("proyecto.gestionar");
  const parsed = TareaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const db = await createClient();
  try {
    await crearTarea(db, user.orgId, parsed.data);
    revalidatePath(`/proyectos/${parsed.data.proyecto_id}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function moverTareaAction(input: unknown): Promise<ActionState> {
  await requireCapability("proyecto.gestionar");
  const parsed = MovimientoSchema.safeParse(input);
  if (!parsed.success) return { error: "Movimiento inválido" };

  const db = await createClient();
  try {
    await moverTarea(
      db,
      parsed.data.tarea_id,
      parsed.data.columna as TareaColumna,
      parsed.data.orden_ids
    );
    revalidatePath(`/proyectos/${parsed.data.proyecto_id}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function actualizarTareaAction(
  tareaId: string,
  proyectoId: string,
  patch: {
    titulo?: string;
    descripcion?: string | null;
    responsable_id?: string | null;
    fecha_limite?: string | null;
  }
): Promise<ActionState> {
  await requireCapability("proyecto.gestionar");
  const db = await createClient();
  try {
    await actualizarTarea(db, tareaId, patch);
    revalidatePath(`/proyectos/${proyectoId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarTareaAction(
  tareaId: string,
  proyectoId: string
): Promise<ActionState> {
  await requireCapability("proyecto.gestionar");
  const db = await createClient();
  await eliminarTarea(db, tareaId);
  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true };
}

export async function actualizarProyectoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireCapability("proyecto.gestionar");
  const proyectoId = String(formData.get("proyecto_id"));
  const parsed = ProyectoUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const db = await createClient();
  const { error } = await db
    .from("proyectos")
    .update({
      ...parsed.data,
      responsable_id: parsed.data.responsable_id ?? null,
      fecha_entrega: parsed.data.fecha_entrega ?? null,
      covac_id: parsed.data.covac_id ?? null,
      hijo_rib: parsed.data.hijo_rib ?? null,
      validacion_num: parsed.data.validacion_num ?? null,
      pdf_num: parsed.data.pdf_num ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proyectoId);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true };
}
