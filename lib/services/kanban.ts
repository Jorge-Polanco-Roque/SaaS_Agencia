import type { TareaColumna } from "@/lib/supabase/database.types";

export const COLUMNAS: { id: TareaColumna; label: string }[] = [
  { id: "por_hacer", label: "Por hacer" },
  { id: "en_proceso", label: "En proceso" },
  { id: "bloqueado", label: "Bloqueado" },
  { id: "hecho", label: "Hecho" },
];

export const COLUMNA_LABEL: Record<TareaColumna, string> = {
  por_hacer: "Por hacer",
  en_proceso: "En proceso",
  bloqueado: "Bloqueado",
  hecho: "Hecho",
};

export interface TareaMinima {
  id: string;
  columna: TareaColumna;
  orden: number;
}

/** Agrupa y ordena tareas por columna (para render del tablero). */
export function agruparPorColumna<T extends TareaMinima>(
  tareas: T[]
): Record<TareaColumna, T[]> {
  const out = {
    por_hacer: [] as T[],
    en_proceso: [] as T[],
    bloqueado: [] as T[],
    hecho: [] as T[],
  } satisfies Record<TareaColumna, T[]>;
  for (const t of tareas) out[t.columna].push(t);
  for (const col of Object.keys(out) as TareaColumna[]) {
    out[col].sort((a, b) => a.orden - b.orden);
  }
  return out;
}

/**
 * Calcula el nuevo arreglo tras mover una tarea a una columna en cierta posición.
 * Función pura: devuelve, por tarea afectada, su columna y orden resultante.
 * Reindexa de forma determinista (0..n) → sin huecos ni colisiones de orden.
 */
export function aplicarMovimiento<T extends TareaMinima>(
  tareas: T[],
  tareaId: string,
  columnaDestino: TareaColumna,
  posicion: number
): { id: string; columna: TareaColumna; orden: number }[] {
  const movida = tareas.find((t) => t.id === tareaId);
  if (!movida) return [];

  const origen = movida.columna;
  const grupos = agruparPorColumna(tareas);

  // Sacar de su columna actual
  grupos[origen] = grupos[origen].filter((t) => t.id !== tareaId);

  // Insertar en destino en la posición acotada
  const destino = grupos[columnaDestino].filter((t) => t.id !== tareaId);
  const pos = Math.max(0, Math.min(posicion, destino.length));
  destino.splice(pos, 0, { ...movida, columna: columnaDestino });
  grupos[columnaDestino] = destino;

  // Reindexar columnas afectadas
  const cambios: { id: string; columna: TareaColumna; orden: number }[] = [];
  const afectadas: TareaColumna[] =
    origen === columnaDestino ? [columnaDestino] : [origen, columnaDestino];
  for (const col of afectadas) {
    grupos[col].forEach((t, i) => {
      cambios.push({ id: t.id, columna: col, orden: i });
    });
  }
  return cambios;
}

/** Reindexa una lista de IDs a {id, orden} secuencial (0..n). */
export function reindexar(ids: string[]): { id: string; orden: number }[] {
  return ids.map((id, i) => ({ id, orden: i }));
}
