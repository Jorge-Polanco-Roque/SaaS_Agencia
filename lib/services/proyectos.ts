import type { DbClient } from "./db";
import type {
  Cotizacion,
  Proyecto,
  TareaColumna,
} from "@/lib/supabase/database.types";
import type { TareaInput } from "@/lib/schemas";
import { registrarBitacora } from "./bitacora";

/** Tareas iniciales del proyecto al confirmarse la cotización. */
const TAREAS_INICIALES: { titulo: string; columna: TareaColumna }[] = [
  { titulo: "Confirmar inventario/disponibilidad con proveedor", columna: "por_hacer" },
  { titulo: "Generar orden de compra", columna: "por_hacer" },
  { titulo: "Coordinar producción/entrega", columna: "por_hacer" },
  { titulo: "Seguimiento de pago y cobranza", columna: "por_hacer" },
];

/**
 * Crea el Master de Proyecto a partir de una cotización confirmada, con sus
 * tareas iniciales. Idempotente por cotizacion_id (índice único).
 */
export async function crearProyectoDesdeCotizacion(
  db: DbClient,
  cot: Cotizacion,
  actorId: string | null
): Promise<Proyecto | null> {
  // Evitar duplicado si ya existe
  const { data: existente } = await db
    .from("proyectos")
    .select("*")
    .eq("cotizacion_id", cot.id)
    .maybeSingle();
  if (existente) return existente;

  const { data: proyecto, error } = await db
    .from("proyectos")
    .insert({
      org_id: cot.org_id,
      cotizacion_id: cot.id,
      cliente_id: cot.cliente_id,
      nombre: cot.titulo,
      responsable_id: cot.owner_id,
      fecha_inicio: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error || !proyecto) {
    throw new Error(`No se pudo crear el proyecto: ${error?.message}`);
  }

  await db.from("tareas").insert(
    TAREAS_INICIALES.map((t, i) => ({
      org_id: cot.org_id,
      proyecto_id: proyecto.id,
      titulo: t.titulo,
      columna: t.columna,
      orden: i,
    }))
  );

  await registrarBitacora(db, cot.org_id, actorId, {
    entidad: "proyecto",
    entidadId: proyecto.id,
    accion: "crear",
    estadoNuevo: "activo",
    meta: { cotizacion: cot.folio ?? cot.id },
  });

  return proyecto;
}

/** Crea una tarea al final de su columna. */
export async function crearTarea(
  db: DbClient,
  orgId: string,
  input: TareaInput
): Promise<void> {
  const { count } = await db
    .from("tareas")
    .select("id", { count: "exact", head: true })
    .eq("proyecto_id", input.proyecto_id)
    .eq("columna", input.columna);

  const { error } = await db.from("tareas").insert({
    org_id: orgId,
    proyecto_id: input.proyecto_id,
    titulo: input.titulo,
    descripcion: input.descripcion ?? null,
    columna: input.columna,
    orden: count ?? 0,
    responsable_id: input.responsable_id ?? null,
    fecha_limite: input.fecha_limite ?? null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Mueve una tarea a una columna y reindexa esa columna según orden_ids.
 * Determinista: orden = índice en orden_ids (0..n) → sin huecos ni colisiones.
 */
export async function moverTarea(
  db: DbClient,
  tareaId: string,
  columna: TareaColumna,
  ordenIds: string[]
): Promise<void> {
  const now = new Date().toISOString();
  // Asegura la columna de la tarea movida
  await db
    .from("tareas")
    .update({ columna, updated_at: now })
    .eq("id", tareaId);

  // Reindexa la columna destino
  await Promise.all(
    ordenIds.map((id, i) =>
      db.from("tareas").update({ orden: i, columna }).eq("id", id)
    )
  );
}

export async function actualizarTarea(
  db: DbClient,
  tareaId: string,
  patch: {
    titulo?: string;
    descripcion?: string | null;
    responsable_id?: string | null;
    fecha_limite?: string | null;
  }
): Promise<void> {
  const { error } = await db
    .from("tareas")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", tareaId);
  if (error) throw new Error(error.message);
}

export async function eliminarTarea(db: DbClient, tareaId: string): Promise<void> {
  await db.from("tareas").delete().eq("id", tareaId);
}
