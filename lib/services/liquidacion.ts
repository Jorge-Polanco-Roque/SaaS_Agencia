/**
 * Liquidación con composición contable (flujo JSM).
 *   neto = + Anticipo / Traspaso (entradas) − Depósito − Entrega $ (salidas)
 * Función PURA y testeable. El SIGNO por concepto es configurable porque el
 * glosario JSM aún no está confirmado (CLAUDE.md §1.4); aquí va el default.
 */
import { round2 } from "./calculos";

export type ConceptoLiquidacion =
  | "anticipo"
  | "traspaso"
  | "deposito"
  | "entrega"
  | "abono";

/** +1 = entra a la liquidación · −1 = sale. Default JSM (por confirmar). */
export const SIGNO_LIQUIDACION: Record<ConceptoLiquidacion, 1 | -1> = {
  anticipo: 1,
  traspaso: 1,
  abono: 1,
  deposito: -1,
  entrega: -1,
};

export interface MovimientoLiquidacion {
  concepto: ConceptoLiquidacion;
  monto: number;
}

export interface EstadoLiquidacion {
  entradas: number;
  salidas: number;
  neto: number;
  porConcepto: Record<ConceptoLiquidacion, number>;
}

function conceptoValido(c: string | null | undefined): c is ConceptoLiquidacion {
  return (
    c === "anticipo" ||
    c === "traspaso" ||
    c === "deposito" ||
    c === "entrega" ||
    c === "abono"
  );
}

/**
 * Calcula el estado de cuenta de liquidación a partir de movimientos.
 * Movimientos con concepto desconocido/nulo se ignoran (no afectan el neto).
 * Invariante: neto === entradas − salidas (sin deriva de redondeo).
 */
export function calcularLiquidacion(
  movimientos: { concepto: string | null | undefined; monto: number }[]
): EstadoLiquidacion {
  const porConcepto: Record<ConceptoLiquidacion, number> = {
    anticipo: 0,
    traspaso: 0,
    deposito: 0,
    entrega: 0,
    abono: 0,
  };
  let entradas = 0;
  let salidas = 0;

  for (const m of movimientos) {
    if (!conceptoValido(m.concepto)) continue;
    const monto = round2(m.monto);
    porConcepto[m.concepto] = round2(porConcepto[m.concepto] + monto);
    if (SIGNO_LIQUIDACION[m.concepto] === 1) entradas = round2(entradas + monto);
    else salidas = round2(salidas + monto);
  }

  return {
    entradas,
    salidas,
    neto: round2(entradas - salidas),
    porConcepto,
  };
}
