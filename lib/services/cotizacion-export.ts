import type { DbClient } from "./db";

export interface CotizacionExport {
  folio: string;
  titulo: string;
  estado: string;
  moneda: string;
  fecha: string;
  cliente: { nombre: string; rfc: string | null; email: string | null };
  items: {
    descripcion: string;
    cantidad: number;
    unidad: string;
    precio_unitario: number;
    importe: number;
  }[];
  subtotal: number;
  descuento: number;
  iva: number;
  iva_tasa: number;
  total: number;
  notas: string | null;
}

/**
 * Carga una cotización lista para exportar. NOTA: el PDF/Excel para el cliente
 * NO incluye costos ni márgenes (solo precio público) — CLAUDE.md §9.
 */
export async function cargarCotizacionExport(
  db: DbClient,
  id: string
): Promise<CotizacionExport | null> {
  const { data: cot } = await db
    .from("cotizaciones")
    .select("*, clientes(nombre, rfc, email)")
    .eq("id", id)
    .single();
  if (!cot) return null;

  const cliente = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes;

  const { data: items } = await db
    .from("cotizacion_items")
    .select("descripcion, cantidad, unidad, precio_unitario, importe, modalidad, rol, dias")
    .eq("cotizacion_id", id)
    .order("orden");

  // Ítems de personal: el importe = personas × días × tarifa. Se anota el
  // desglose en la descripción para que el documento del cliente cuadre.
  const itemsExport = (items ?? []).map((it) => {
    if (it.modalidad === "personal" && (it.dias ?? 1) > 1) {
      const rol = it.rol ? `${it.rol}: ` : "";
      return {
        descripcion: `${rol}${it.descripcion} (${it.cantidad} pers. × ${it.dias} días)`,
        cantidad: it.cantidad,
        unidad: it.unidad,
        precio_unitario: it.precio_unitario,
        importe: it.importe,
      };
    }
    return {
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      unidad: it.unidad,
      precio_unitario: it.precio_unitario,
      importe: it.importe,
    };
  });

  return {
    folio: cot.folio ?? "BORRADOR",
    titulo: cot.titulo,
    estado: cot.estado,
    moneda: cot.moneda,
    fecha: new Date(cot.created_at).toLocaleDateString("es-MX"),
    cliente: {
      nombre: cliente?.nombre ?? "—",
      rfc: cliente?.rfc ?? null,
      email: cliente?.email ?? null,
    },
    items: itemsExport,
    subtotal: cot.subtotal,
    descuento: cot.descuento,
    iva: cot.iva,
    iva_tasa: cot.iva_tasa,
    total: cot.total,
    notas: cot.notas,
  };
}
