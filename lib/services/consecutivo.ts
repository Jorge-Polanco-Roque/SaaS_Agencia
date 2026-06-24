import type { DbClient } from "./db";

/** Formatea el folio: COT-2026-00007 */
export function formatFolio(serie: string, anio: number, num: number): string {
  return `${serie}-${anio}-${String(num).padStart(5, "0")}`;
}

export interface FolioAsignado {
  serie: string;
  anio: number;
  num: number;
  folio: string;
}

/**
 * Reserva el siguiente consecutivo de forma atómica vía la función
 * `next_consecutivo` (SECURITY DEFINER). Seguro bajo concurrencia.
 */
export async function reservarFolio(
  db: DbClient,
  orgId: string,
  serie: string,
  anio: number
): Promise<FolioAsignado> {
  const { data, error } = await db.rpc("next_consecutivo", {
    p_org: orgId,
    p_serie: serie,
    p_anio: anio,
  });

  if (error || data == null) {
    throw new Error(`No se pudo reservar el folio: ${error?.message ?? "sin dato"}`);
  }

  const num = data as number;
  return { serie, anio, num, folio: formatFolio(serie, anio, num) };
}
