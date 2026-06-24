"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import {
  FacturaSchema,
  OrdenCompraSchema,
  PagoSchema,
  PullSchema,
} from "@/lib/schemas";
import {
  crearOrdenCompra,
  programarDispersion,
  registrarFactura,
  registrarPago,
  transicionarOC,
  type AccionOC,
} from "@/lib/services/compras";
import { rankearProveedores } from "@/lib/services/pull-proveedores";

export type ActionState = { ok?: boolean; error?: string };
export type FormResult = { ok?: boolean; error?: string; id?: string };

export async function nuevaOrdenCompraAction(input: unknown): Promise<FormResult> {
  const user = await requireCapability("compras.gestionar");
  const parsed = OrdenCompraSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const db = await createClient();
  try {
    const oc = await crearOrdenCompra(db, user, parsed.data);
    revalidatePath("/compras");
    return { ok: true, id: oc.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function transicionOCAction(
  ocId: string,
  accion: AccionOC
): Promise<ActionState> {
  const user = await requireCapability("compras.gestionar");
  const db = await createClient();
  const res = await transicionarOC(db, user, ocId, accion);
  if (!res.ok) return { error: res.error };
  revalidatePath(`/compras/${ocId}`);
  revalidatePath("/compras");
  return { ok: true };
}

export async function registrarPagoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("finanzas.gestionar");
  const parsed = PagoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const db = await createClient();

  // Contexto (proyecto/proveedor) desde la OC ligada
  let proyectoId: string | null = null;
  let proveedorId: string | null = null;
  if (parsed.data.orden_compra_id) {
    const { data: oc } = await db
      .from("ordenes_compra")
      .select("proyecto_id, proveedor_id")
      .eq("id", parsed.data.orden_compra_id)
      .single();
    proyectoId = oc?.proyecto_id ?? null;
    proveedorId = oc?.proveedor_id ?? null;
  }

  try {
    await registrarPago(db, user, parsed.data, { proyectoId, proveedorId });
    if (parsed.data.orden_compra_id) {
      revalidatePath(`/compras/${parsed.data.orden_compra_id}`);
    }
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function programarDispersionAction(
  ocId: string,
  parcialidades: number,
  diasEntre: number
): Promise<ActionState> {
  const user = await requireCapability("compras.gestionar");
  const db = await createClient();

  const { data: oc } = await db
    .from("ordenes_compra")
    .select("id, total, proyecto_id, proveedor_id")
    .eq("id", ocId)
    .single();
  if (!oc) return { error: "OC no encontrada" };
  if (!oc.total || oc.total <= 0) return { error: "La OC no tiene monto" };

  const n = Math.min(36, Math.max(1, Math.floor(parcialidades) || 1));
  try {
    await programarDispersion(db, user, {
      orden_compra_id: oc.id,
      proyecto_id: oc.proyecto_id,
      proveedor_id: oc.proveedor_id,
      montoTotal: oc.total,
      opciones: { parcialidades: n, diasEntre: Math.max(0, Math.floor(diasEntre) || 0) },
    });
    revalidatePath(`/compras/${ocId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function registrarFacturaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireCapability("finanzas.gestionar");
  const parsed = FacturaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const db = await createClient();
  try {
    await registrarFactura(db, user, parsed.data);
    if (parsed.data.orden_compra_id) {
      revalidatePath(`/compras/${parsed.data.orden_compra_id}`);
    }
    revalidatePath("/finanzas");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export interface PullResult {
  ok: boolean;
  error?: string;
  recomendaciones?: { proveedor_id: string; nombre: string; razon: string }[];
  resumen?: string;
}

export async function pullAction(input: unknown): Promise<PullResult> {
  await requireCapability("compras.gestionar");
  const parsed = PullSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const db = await createClient();

  // Costo de referencia = costo promedio del catálogo por proveedor
  const [{ data: proveedores }, { data: productos }] = await Promise.all([
    db.from("proveedores").select("id, nombre, categoria, dias_entrega").eq("activo", true),
    db.from("productos_servicios").select("proveedor_id, costo"),
  ]);

  const costos = new Map<string, { suma: number; n: number }>();
  for (const p of productos ?? []) {
    if (!p.proveedor_id) continue;
    const acc = costos.get(p.proveedor_id) ?? { suma: 0, n: 0 };
    acc.suma += p.costo;
    acc.n += 1;
    costos.set(p.proveedor_id, acc);
  }

  const rankeados = rankearProveedores(
    (proveedores ?? []).map((p) => {
      const c = costos.get(p.id);
      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        dias_entrega: p.dias_entrega,
        costo_referencia: c ? Math.round(c.suma / c.n) : null,
      };
    }),
    parsed.data.prioridad
  );

  // Si hay OpenAI, refinar con el agente; si no, devolver el ranking determinista.
  try {
    const { runPull } = await import("@/lib/agents/pull/graph");
    const res = await runPull(parsed.data.requisicion, parsed.data.prioridad, rankeados);
    return { ok: true, recomendaciones: res.recomendaciones, resumen: res.resumen };
  } catch {
    return {
      ok: true,
      resumen: "Ranking determinista (sin IA configurada).",
      recomendaciones: rankeados.slice(0, 5).map((p) => ({
        proveedor_id: p.id,
        nombre: p.nombre,
        razon: `Score ${p.score} · ${p.motivo}`,
      })),
    };
  }
}
