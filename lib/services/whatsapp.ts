/**
 * WhatsApp Business Cloud API (Meta). No-op seguro si faltan credenciales.
 * Fase 4. Para producción: número verificado + plantillas aprobadas.
 */
export interface EnvioResultado {
  ok: boolean;
  simulado?: boolean;
  id?: string;
  error?: string;
}

const API_VERSION = "v21.0";

function normalizarTelefono(tel: string): string {
  // Deja solo dígitos. Asume MX si vienen 10 dígitos (prefijo 52).
  const digits = tel.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

async function postWhatsApp(payload: Record<string, unknown>): Promise<EnvioResultado> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.info("[whatsapp] (sin credenciales) →", JSON.stringify(payload));
    return { ok: true, simulado: true };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      }
    );
    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, id: json.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
  }
}

/** Mensaje de texto (solo válido dentro de la ventana de 24h de sesión). */
export function enviarWhatsAppTexto(
  telefono: string,
  cuerpo: string
): Promise<EnvioResultado> {
  return postWhatsApp({
    to: normalizarTelefono(telefono),
    type: "text",
    text: { body: cuerpo },
  });
}

/** Plantilla aprobada (para iniciar conversación / notificaciones). */
export function enviarWhatsAppPlantilla(
  telefono: string,
  plantilla: string,
  idioma: string,
  parametros: string[]
): Promise<EnvioResultado> {
  return postWhatsApp({
    to: normalizarTelefono(telefono),
    type: "template",
    template: {
      name: plantilla,
      language: { code: idioma },
      components: parametros.length
        ? [
            {
              type: "body",
              parameters: parametros.map((p) => ({ type: "text", text: p })),
            },
          ]
        : undefined,
    },
  });
}
