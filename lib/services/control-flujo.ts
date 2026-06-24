/**
 * Control de Flujo (Track ID ★★ del swimlane): detecta cuellos de botella y
 * pendientes que requieren atención. Función pura → testeable.
 */
export type NivelAlerta = "alta" | "media" | "baja";

export interface Alerta {
  nivel: NivelAlerta;
  tipo: string;
  mensaje: string;
  entidad: string;
  entidad_id: string;
}

export interface ControlFlujoInput {
  cotizaciones: {
    id: string;
    folio: string | null;
    titulo: string;
    estado: string;
    enviada_at: string | null;
  }[];
  ocs: {
    id: string;
    folio: string | null;
    estado: string;
    saldo: number;
    autorizada_at: string | null;
  }[];
  facturas: {
    id: string;
    folio: string;
    tipo: string;
    estado: string;
    fecha_vencimiento: string | null;
  }[];
  proyectos: { id: string; nombre: string; estado: string; num_tareas: number }[];
}

/** Días entre dos fechas ISO (yyyy-mm-dd o timestamp). */
export function diasEntre(desdeISO: string, hastaISO: string): number {
  const a = new Date(desdeISO).getTime();
  const b = new Date(hastaISO).getTime();
  return Math.floor((b - a) / 86_400_000);
}

const UMBRAL_COTIZACION_DIAS = 5; // sin respuesta del cliente
const UMBRAL_OC_PAGO_DIAS = 7; // autorizada sin pago

export function detectarAnomalias(
  input: ControlFlujoInput,
  hoyISO: string
): Alerta[] {
  const alertas: Alerta[] = [];

  for (const c of input.cotizaciones) {
    if (c.estado === "enviada_cliente" && c.enviada_at) {
      const dias = diasEntre(c.enviada_at, hoyISO);
      if (dias >= UMBRAL_COTIZACION_DIAS) {
        alertas.push({
          nivel: "media",
          tipo: "cotizacion_sin_respuesta",
          mensaje: `Cotización ${c.folio ?? c.titulo} lleva ${dias} días sin respuesta del cliente.`,
          entidad: "cotizacion",
          entidad_id: c.id,
        });
      }
    }
  }

  for (const o of input.ocs) {
    if (o.estado === "autorizada" && o.saldo > 0 && o.autorizada_at) {
      const dias = diasEntre(o.autorizada_at, hoyISO);
      if (dias >= UMBRAL_OC_PAGO_DIAS) {
        alertas.push({
          nivel: "alta",
          tipo: "oc_pago_pendiente",
          mensaje: `OC ${o.folio ?? ""} autorizada hace ${dias} días con saldo pendiente.`,
          entidad: "orden_compra",
          entidad_id: o.id,
        });
      }
    }
  }

  for (const f of input.facturas) {
    if (
      f.tipo === "emitida_cliente" &&
      f.estado === "registrada" &&
      f.fecha_vencimiento &&
      f.fecha_vencimiento < hoyISO
    ) {
      alertas.push({
        nivel: "alta",
        tipo: "factura_vencida",
        mensaje: `Factura ${f.folio} vencida (cobranza pendiente).`,
        entidad: "factura",
        entidad_id: f.id,
      });
    }
  }

  for (const p of input.proyectos) {
    if (p.estado === "activo" && p.num_tareas === 0) {
      alertas.push({
        nivel: "baja",
        tipo: "proyecto_sin_tareas",
        mensaje: `Proyecto "${p.nombre}" activo sin tareas.`,
        entidad: "proyecto",
        entidad_id: p.id,
      });
    }
  }

  const peso: Record<NivelAlerta, number> = { alta: 0, media: 1, baja: 2 };
  return alertas.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}
