"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { ClienteSchema, ContactoSchema } from "@/lib/schemas";

export type ActionState = { ok?: boolean; error?: string };

export async function crearCliente(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("crm.gestionar");
  const parsed = ClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const db = await createClient();
  const { error } = await db.from("clientes").insert({
    org_id: user.orgId,
    created_by: user.id,
    nombre: parsed.data.nombre,
    rfc: parsed.data.rfc ?? null,
    email: parsed.data.email ?? null,
    telefono: parsed.data.telefono ?? null,
    notas: parsed.data.notas ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { ok: true };
}

export async function crearContacto(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("crm.gestionar");
  const parsed = ContactoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const db = await createClient();
  const { error } = await db.from("contactos").insert({
    org_id: user.orgId,
    cliente_id: parsed.data.cliente_id,
    nombre: parsed.data.nombre,
    cargo: parsed.data.cargo ?? null,
    email: parsed.data.email ?? null,
    telefono: parsed.data.telefono ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/crm/${parsed.data.cliente_id}`);
  return { ok: true };
}
