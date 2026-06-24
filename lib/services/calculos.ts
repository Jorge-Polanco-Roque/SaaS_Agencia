/** Cálculo de totales y márgenes de una cotización. Funciones puras (testeables). */

export interface ItemCalculable {
  cantidad: number;
  costo_unitario: number;
  precio_unitario: number;
  /**
   * Días de servicio (ítems de personal: rol × personas × días). Para ítems de
   * producto se omite y equivale a 1, preservando `cantidad × precio_unitario`.
   */
  dias?: number;
}

/** Factor de días: ≥1; ausente/0/negativo ⇒ 1 (retrocompatibilidad con productos). */
function factorDias(item: ItemCalculable): number {
  const d = item.dias ?? 1;
  return d >= 1 ? d : 1;
}

export interface TotalesCotizacion {
  subtotal: number;
  iva: number;
  total: number;
  costo_total: number;
  margen: number;
  margen_pct: number;
}

/** Redondea a 2 decimales evitando errores de coma flotante. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function importeItem(item: ItemCalculable): number {
  return round2(item.cantidad * factorDias(item) * item.precio_unitario);
}

/** Costo interno del ítem (cantidad × días × costo_unitario). */
export function costoItem(item: ItemCalculable): number {
  return round2(item.cantidad * factorDias(item) * item.costo_unitario);
}

export function calcularTotales(
  items: ItemCalculable[],
  opts: { descuento?: number; ivaTasa?: number } = {}
): TotalesCotizacion {
  const descuento = Math.max(0, opts.descuento ?? 0);
  const ivaTasa = opts.ivaTasa ?? 0.16;

  const bruto = items.reduce((acc, it) => acc + importeItem(it), 0);
  const subtotal = round2(Math.max(0, bruto - descuento));
  const costo_total = round2(
    items.reduce((acc, it) => acc + costoItem(it), 0)
  );
  const iva = round2(subtotal * ivaTasa);
  const total = round2(subtotal + iva);
  const margen = round2(subtotal - costo_total);
  const margen_pct = subtotal > 0 ? round2((margen / subtotal) * 100) : 0;

  return { subtotal, iva, total, costo_total, margen, margen_pct };
}

/** Formatea moneda MXN (u otra) para UI/PDF. */
export function formatMoneda(n: number, moneda = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: moneda,
  }).format(n);
}
