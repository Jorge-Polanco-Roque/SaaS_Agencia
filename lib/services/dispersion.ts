/**
 * Dispersión "Tiempo × días" (flujo JSM Operaciones).
 * Reparte un monto total en parcialidades a lo largo del tiempo acordado.
 * Funciones PURAS y testeables: la invariante clave es Σ parcialidades === total
 * (sin deriva por redondeo) — la última cuota absorbe el centavo residual.
 */
import { round2 } from "./calculos";

export interface ParcialidadDispersion {
  numero: number;
  fecha: string; // ISO yyyy-mm-dd
  monto: number;
  concepto: string;
  porcentaje: number; // % del total (informativo)
}

export interface OpcionesDispersion {
  /** Número de parcialidades iguales (ignorado si se pasa `porcentajes`). */
  parcialidades?: number;
  /** Esquema de % fijo, ej. [50, 30, 20]. Tiene prioridad sobre `parcialidades`. */
  porcentajes?: number[];
  /** Fecha de la 1ª parcialidad (ISO). Default: hoy. */
  fechaInicio?: string;
  /** Días entre parcialidades (dispersión por tiempo). Default 30. */
  diasEntre?: number;
  /** Etiqueta base del concepto. Default "Parcialidad". */
  etiqueta?: string;
}

function isoSumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calcula el calendario de dispersión. Garantiza Σ montos === round2(montoTotal).
 */
export function calcularDispersion(
  montoTotal: number,
  opts: OpcionesDispersion = {}
): ParcialidadDispersion[] {
  const total = round2(Math.max(0, montoTotal));
  const etiqueta = opts.etiqueta ?? "Parcialidad";
  const fechaInicio = opts.fechaInicio ?? hoyIso();
  const diasEntre = Number.isFinite(opts.diasEntre)
    ? Math.max(0, Math.floor(opts.diasEntre as number))
    : 30;

  // Determina los pesos (porcentajes) de cada parcialidad.
  let pesos: number[];
  if (opts.porcentajes && opts.porcentajes.length > 0) {
    const suma = opts.porcentajes.reduce((a, b) => a + Math.max(0, b), 0);
    if (suma <= 0) pesos = [100];
    else pesos = opts.porcentajes.map((p) => (Math.max(0, p) / suma) * 100);
  } else {
    const n = Math.max(1, Math.floor(opts.parcialidades ?? 1));
    pesos = Array.from({ length: n }, () => 100 / n);
  }

  const n = pesos.length;
  const out: ParcialidadDispersion[] = [];
  let acumulado = 0;
  for (let i = 0; i < n; i++) {
    const esUltima = i === n - 1;
    // La última absorbe el residuo para que la suma cuadre exacto.
    const monto = esUltima
      ? round2(total - acumulado)
      : round2((total * pesos[i]) / 100);
    acumulado = round2(acumulado + monto);
    out.push({
      numero: i + 1,
      fecha: isoSumarDias(fechaInicio, i * diasEntre),
      monto,
      concepto: `${etiqueta} ${i + 1}/${n}`,
      porcentaje: round2(pesos[i]),
    });
  }
  return out;
}

/** Suma de una dispersión (helper para validar/mostrar). */
export function totalDispersion(parcialidades: ParcialidadDispersion[]): number {
  return round2(parcialidades.reduce((a, p) => a + p.monto, 0));
}
