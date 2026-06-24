import type { DbClient } from "./db";

export interface RegistroBitacora {
  entidad: string;
  entidadId: string;
  accion: string;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  meta?: Record<string, unknown>;
}

/** Registra un evento de trazabilidad (Track ID — CLAUDE.md §4.2). */
export async function registrarBitacora(
  db: DbClient,
  orgId: string,
  actorId: string | null,
  r: RegistroBitacora
): Promise<void> {
  await db.from("bitacora").insert({
    org_id: orgId,
    entidad: r.entidad,
    entidad_id: r.entidadId,
    accion: r.accion,
    estado_anterior: r.estadoAnterior ?? null,
    estado_nuevo: r.estadoNuevo ?? null,
    actor_id: actorId,
    meta: (r.meta ?? null) as never,
  });
}
