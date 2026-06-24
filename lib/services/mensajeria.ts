import type { DbClient } from "./db";
import type { NotifCanal } from "@/lib/supabase/database.types";
import { enviarWhatsAppTexto, type EnvioResultado } from "./whatsapp";

export interface Mensaje {
  orgId: string;
  canal: NotifCanal;
  para: string;
  asunto?: string;
  cuerpo: string;
  entidad?: string;
  entidadId?: string | null;
}

async function enviarEmail(
  para: string,
  asunto: string,
  cuerpo: string
): Promise<EnvioResultado> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "JSM Flow <noreply@jsm.test>";
  if (!apiKey) {
    console.info(`[email] (sin RESEND_API_KEY) → ${para}: ${asunto}`);
    return { ok: true, simulado: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: para, subject: asunto, text: cuerpo }),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: json.message ?? `HTTP ${res.status}` };
    return { ok: true, id: json.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
  }
}

/**
 * Envía un mensaje por el canal indicado y lo registra en `notificaciones`.
 * Nunca lanza: devuelve el resultado para que el llamador decida.
 */
export async function enviarMensaje(
  db: DbClient,
  msg: Mensaje
): Promise<EnvioResultado> {
  const res =
    msg.canal === "whatsapp"
      ? await enviarWhatsAppTexto(msg.para, msg.cuerpo)
      : await enviarEmail(msg.para, msg.asunto ?? "JSM Flow", msg.cuerpo);

  const estado = !res.ok ? "fallido" : res.simulado ? "simulado" : "enviado";

  await db.from("notificaciones").insert({
    org_id: msg.orgId,
    canal: msg.canal,
    destinatario: msg.para,
    asunto: msg.asunto ?? null,
    cuerpo: msg.cuerpo,
    entidad: msg.entidad ?? null,
    entidad_id: msg.entidadId ?? null,
    estado,
    proveedor_msg_id: res.id ?? null,
    error: res.error ?? null,
  });

  return res;
}
