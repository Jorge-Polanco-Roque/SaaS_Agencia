import type { DbClient } from "./db";
import { diasEntre } from "./control-flujo";
import { enviarMensaje } from "./mensajeria";
import type { FacturaVencida } from "@/lib/agents/cobranza/graph";

export interface FacturaSeleccion {
  id: string;
  folio: string;
  monto: number;
  tipo: string;
  estado: string;
  fecha_vencimiento: string | null;
}

export interface Vencida {
  id: string;
  folio: string;
  monto: number;
  dias: number;
}

/** Selecciona facturas a cliente vencidas más allá de los días de gracia. (Pura) */
export function seleccionarVencidas(
  facturas: FacturaSeleccion[],
  hoyISO: string,
  diasGracia = 0
): Vencida[] {
  const out: Vencida[] = [];
  for (const f of facturas) {
    if (f.tipo !== "emitida_cliente" || f.estado !== "registrada") continue;
    if (!f.fecha_vencimiento) continue;
    const dias = diasEntre(f.fecha_vencimiento, hoyISO);
    if (dias > diasGracia) {
      out.push({ id: f.id, folio: f.folio, monto: f.monto, dias });
    }
  }
  return out.sort((a, b) => b.dias - a.dias);
}

export interface ResumenCobranzaRun {
  total: number;
  enviados: number;
  simulados: number;
  fallidos: number;
  sinContacto: number;
}

/** Ejecuta una ronda de cobranza: redacta y envía recordatorios de vencidas. */
export async function ejecutarCobranza(
  db: DbClient,
  orgId: string,
  hoyISO: string
): Promise<ResumenCobranzaRun> {
  const { data: facturas } = await db
    .from("facturas")
    .select("*, clientes(nombre, email, telefono)")
    .eq("org_id", orgId)
    .eq("tipo", "emitida_cliente")
    .eq("estado", "registrada");

  const lista = facturas ?? [];
  const vencidas = seleccionarVencidas(
    lista.map((f) => ({
      id: f.id,
      folio: f.folio,
      monto: f.monto,
      tipo: f.tipo,
      estado: f.estado,
      fecha_vencimiento: f.fecha_vencimiento,
    })),
    hoyISO
  );

  const resumen: ResumenCobranzaRun = {
    total: vencidas.length,
    enviados: 0,
    simulados: 0,
    fallidos: 0,
    sinContacto: 0,
  };
  if (vencidas.length === 0) return resumen;

  const porId = new Map(lista.map((f) => [f.id, f]));

  // Redacción: agente IA si está configurado; si no, plantilla determinista.
  const mensajePorFactura = new Map<string, { asunto: string; mensaje: string }>();
  try {
    const { runCobranza } = await import("@/lib/agents/cobranza/graph");
    const entrada: FacturaVencida[] = vencidas.map((v) => {
      const f = porId.get(v.id);
      const cliente = f
        ? Array.isArray(f.clientes)
          ? f.clientes[0]
          : f.clientes
        : null;
      return {
        factura_id: v.id,
        cliente: cliente?.nombre ?? "Cliente",
        folio: v.folio,
        monto: v.monto,
        moneda: "MXN",
        dias_vencido: v.dias,
      };
    });
    const out = await runCobranza(entrada);
    for (const m of out.mensajes)
      mensajePorFactura.set(m.factura_id, { asunto: m.asunto, mensaje: m.mensaje });
  } catch {
    // Fallback: plantilla
    for (const v of vencidas) {
      mensajePorFactura.set(v.id, {
        asunto: `Recordatorio de pago — factura ${v.folio}`,
        mensaje: `Le recordamos el saldo pendiente de la factura ${v.folio} por $${v.monto}, vencida hace ${v.dias} días. Quedamos atentos para apoyarle con el pago.`,
      });
    }
  }

  for (const v of vencidas) {
    const f = porId.get(v.id);
    const cliente = f
      ? Array.isArray(f.clientes)
        ? f.clientes[0]
        : f.clientes
      : null;
    const tpl = mensajePorFactura.get(v.id) ?? {
      asunto: `Recordatorio de pago — factura ${v.folio}`,
      mensaje: `Recordatorio de pago de la factura ${v.folio}.`,
    };

    const canal = cliente?.telefono ? "whatsapp" : cliente?.email ? "email" : null;
    const para = cliente?.telefono ?? cliente?.email ?? null;
    if (!canal || !para) {
      resumen.sinContacto += 1;
      continue;
    }

    const res = await enviarMensaje(db, {
      orgId,
      canal,
      para,
      asunto: tpl.asunto,
      cuerpo: tpl.mensaje,
      entidad: "factura",
      entidadId: v.id,
    });
    if (!res.ok) resumen.fallidos += 1;
    else if (res.simulado) resumen.simulados += 1;
    else resumen.enviados += 1;
  }

  return resumen;
}
