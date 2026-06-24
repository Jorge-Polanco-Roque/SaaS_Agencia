/** Pull de Proveedores: ranking por tiempo de entrega y costo de referencia. */

export type PrioridadPull = "costo" | "tiempo" | "balance";

export interface ProveedorPull {
  id: string;
  nombre: string;
  categoria: string | null;
  dias_entrega: number | null;
  costo_referencia: number | null; // p.ej. costo promedio de su catálogo
}

export interface ProveedorRankeado extends ProveedorPull {
  score: number; // 0..100 (mayor es mejor)
  motivo: string;
}

function normalizar(valores: (number | null)[]): (v: number | null) => number {
  const definidos = valores.filter((v): v is number => v != null);
  const min = definidos.length ? Math.min(...definidos) : 0;
  const max = definidos.length ? Math.max(...definidos) : 0;
  const rango = max - min;
  // Devuelve 0 (mejor) .. 1 (peor). Nulos => 1 (peor).
  return (v) => {
    if (v == null) return 1;
    if (rango === 0) return 0;
    return (v - min) / rango;
  };
}

const PESOS: Record<PrioridadPull, { tiempo: number; costo: number }> = {
  tiempo: { tiempo: 1, costo: 0 },
  costo: { tiempo: 0, costo: 1 },
  balance: { tiempo: 0.5, costo: 0.5 },
};

export function rankearProveedores(
  proveedores: ProveedorPull[],
  prioridad: PrioridadPull = "balance"
): ProveedorRankeado[] {
  const normDias = normalizar(proveedores.map((p) => p.dias_entrega));
  const normCosto = normalizar(proveedores.map((p) => p.costo_referencia));
  const w = PESOS[prioridad];

  return proveedores
    .map((p) => {
      const penalizacion =
        w.tiempo * normDias(p.dias_entrega) + w.costo * normCosto(p.costo_referencia);
      const score = Math.round((1 - penalizacion) * 100);
      const partes: string[] = [];
      if (p.dias_entrega != null) partes.push(`${p.dias_entrega} días`);
      if (p.costo_referencia != null)
        partes.push(`costo ref. ${p.costo_referencia}`);
      return {
        ...p,
        score,
        motivo: partes.join(" · ") || "Sin métricas",
      };
    })
    .sort((a, b) => b.score - a.score);
}
