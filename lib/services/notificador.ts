import type { DbClient } from "./db";
import type { Cotizacion } from "@/lib/supabase/database.types";
import type { Transicion } from "./state-machine";
import { ESTADO_LABELS } from "./state-machine";
import { enviarMensaje } from "./mensajeria";

/**
 * Selecciona los correos de Contabilidad a notificar (flujo JSM: "Sube a portal
 * → Notifica a Contabilidad"). Función PURA y testeable: combina el correo de
 * entorno con los perfiles de rol `contabilidad` que tengan email, sin duplicar.
 */
export function seleccionarDestinatariosContabilidad(opts: {
  envEmail?: string | null;
  perfiles?: { rol: string; email?: string | null }[];
}): string[] {
  const set = new Set<string>();
  if (opts.envEmail) set.add(opts.envEmail.trim());
  for (const p of opts.perfiles ?? []) {
    if (p.rol === "contabilidad" && p.email) set.add(p.email.trim());
  }
  return [...set].filter(Boolean);
}

/** Notifica a Contabilidad un evento de la cotización (sube a portal / confirma). */
export async function notificarContabilidad(
  db: DbClient,
  cot: Pick<Cotizacion, "org_id" | "id" | "folio" | "titulo">,
  evento: string
): Promise<void> {
  const destinatarios = seleccionarDestinatariosContabilidad({
    envEmail: process.env.NOTIFY_CONTABILIDAD_EMAIL,
  });
  for (const para of destinatarios) {
    await enviarMensaje(db, {
      orgId: cot.org_id,
      canal: "email",
      para,
      asunto: `Contabilidad — ${evento}: ${cot.titulo}`,
      cuerpo: `La cotización ${cot.folio ?? ""} "${cot.titulo}" ${evento}. Revisa recepción contable.`,
      entidad: "cotizacion",
      entidadId: cot.id,
    });
  }
}

/**
 * Notifica según la transición aplicada a una cotización.
 * Canal: WhatsApp si el cliente tiene teléfono; si no, email. Se registra en
 * `notificaciones`. Fase 1 introdujo email; Fase 4 añade WhatsApp.
 */
export async function enviarNotificacionTransicion(
  db: DbClient,
  cot: Cotizacion,
  transicion: Transicion
): Promise<void> {
  if (transicion === "enviar_a_cliente") {
    const { data: cliente } = await db
      .from("clientes")
      .select("nombre, email, telefono")
      .eq("id", cot.cliente_id)
      .single();

    const cuerpo = `Hola ${cliente?.nombre ?? ""}, tu cotización ${
      cot.folio ?? ""
    } por ${cot.total} ${cot.moneda} está lista. Revísala y confírmala en tu portal.`;

    if (cliente?.telefono) {
      await enviarMensaje(db, {
        orgId: cot.org_id,
        canal: "whatsapp",
        para: cliente.telefono,
        cuerpo,
        entidad: "cotizacion",
        entidadId: cot.id,
      });
    } else if (cliente?.email) {
      await enviarMensaje(db, {
        orgId: cot.org_id,
        canal: "email",
        para: cliente.email,
        asunto: `Tu cotización ${cot.folio ?? ""} — ${cot.titulo}`,
        cuerpo,
        entidad: "cotizacion",
        entidadId: cot.id,
      });
    }

    // Flujo JSM: al subir al portal del cliente, se notifica a Contabilidad.
    await notificarContabilidad(db, cot, "se subió al portal del cliente");
    return;
  }

  if (transicion === "enviar_a_validacion") {
    const para = process.env.NOTIFY_ADMIN_EMAIL;
    if (para) {
      await enviarMensaje(db, {
        orgId: cot.org_id,
        canal: "email",
        para,
        asunto: `Cotización por validar: ${cot.titulo}`,
        cuerpo: `La cotización "${cot.titulo}" está lista para validación.`,
        entidad: "cotizacion",
        entidadId: cot.id,
      });
    }
    return;
  }

  console.info(
    `[notificador] ${cot.titulo}: ${transicion} → ${ESTADO_LABELS[cot.estado]}`
  );
}
