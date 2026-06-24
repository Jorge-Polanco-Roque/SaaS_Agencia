import { round2 } from "./calculos";

/** Totales de una orden de compra (sin margen; solo costos). */
export interface ItemOC {
  cantidad: number;
  costo_unitario: number;
}
export function totalesOrdenCompra(items: ItemOC[], ivaTasa = 0.16) {
  const subtotal = round2(
    items.reduce((acc, it) => acc + it.cantidad * it.costo_unitario, 0)
  );
  const iva = round2(subtotal * ivaTasa);
  const total = round2(subtotal + iva);
  return { subtotal, iva, total };
}

export function importeOC(it: ItemOC): number {
  return round2(it.cantidad * it.costo_unitario);
}

/**
 * Resumen financiero de una OC frente a sus pagos.
 * Invariante: pagado + saldo === total (sin deriva de redondeo).
 */
export interface ResumenPagos {
  total: number;
  pagado: number;
  saldo: number;
  porcentaje: number;
  liquidado: boolean;
  sobrepagado: boolean;
}
export function resumenPagos(
  total: number,
  pagos: { monto: number }[]
): ResumenPagos {
  const pagado = round2(pagos.reduce((acc, p) => acc + p.monto, 0));
  const saldo = round2(total - pagado);
  const porcentaje = total > 0 ? round2((pagado / total) * 100) : 0;
  return {
    total: round2(total),
    pagado,
    saldo,
    porcentaje,
    liquidado: saldo <= 0 && total > 0,
    sobrepagado: saldo < 0,
  };
}

/** Cuentas por cobrar a partir de facturas emitidas al cliente. */
export interface FacturaCobranza {
  monto: number;
  estado: "registrada" | "pagada" | "cancelada";
  fecha_vencimiento: string | null;
}
export function resumenCobranza(
  facturas: FacturaCobranza[],
  hoyISO: string
): { porCobrar: number; cobrado: number; vencido: number } {
  let porCobrar = 0;
  let cobrado = 0;
  let vencido = 0;
  for (const f of facturas) {
    if (f.estado === "cancelada") continue;
    if (f.estado === "pagada") {
      cobrado = round2(cobrado + f.monto);
      continue;
    }
    porCobrar = round2(porCobrar + f.monto);
    if (f.fecha_vencimiento && f.fecha_vencimiento < hoyISO) {
      vencido = round2(vencido + f.monto);
    }
  }
  return { porCobrar, cobrado, vencido };
}
