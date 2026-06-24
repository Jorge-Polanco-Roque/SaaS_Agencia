"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { ProductoSchema, ProveedorSchema } from "@/lib/schemas";

export type ActionState = { ok?: boolean; error?: string };

export async function crearProveedor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("catalogo.gestionar");
  const parsed = ProveedorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const db = await createClient();
  const { error } = await db.from("proveedores").insert({
    org_id: user.orgId,
    nombre: parsed.data.nombre,
    categoria: parsed.data.categoria ?? null,
    contacto: parsed.data.contacto ?? null,
    email: parsed.data.email ?? null,
    telefono: parsed.data.telefono ?? null,
    dias_entrega: parsed.data.dias_entrega ?? null,
    notas: parsed.data.notas ?? null,
    activo: parsed.data.activo,
  });
  if (error) return { error: error.message };

  revalidatePath("/catalogo");
  return { ok: true };
}

export async function crearProducto(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("catalogo.gestionar");
  const parsed = ProductoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const db = await createClient();
  const { error } = await db.from("productos_servicios").insert({
    org_id: user.orgId,
    tipo: parsed.data.tipo,
    nombre: parsed.data.nombre,
    descripcion: parsed.data.descripcion ?? null,
    unidad: parsed.data.unidad,
    costo: parsed.data.costo,
    precio_publico: parsed.data.precio_publico,
    proveedor_id: parsed.data.proveedor_id ?? null,
    activo: parsed.data.activo,
  });
  if (error) return { error: error.message };

  revalidatePath("/catalogo");
  return { ok: true };
}
