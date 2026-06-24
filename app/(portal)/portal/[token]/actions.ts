"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  confirmarPorToken,
  solicitarCambiosPorToken,
} from "@/lib/services/portal";
import { consume } from "@/lib/security/rate-limit";
import { clienteKey } from "@/lib/security/request-key";

async function limitarPortal(): Promise<string | null> {
  const r = consume(await clienteKey("portal"), 20, 60_000);
  return r.ok ? null : "Demasiadas solicitudes. Intenta más tarde.";
}

export type PortalActionState = { ok?: boolean; error?: string; mensaje?: string };

const TokenSchema = z.string().uuid();

export async function confirmarAction(
  token: string
): Promise<PortalActionState> {
  if (!TokenSchema.safeParse(token).success) return { error: "Enlace inválido" };
  const lim = await limitarPortal();
  if (lim) return { error: lim };
  const res = await confirmarPorToken(token);
  if (!res.ok) return { error: res.error };
  revalidatePath(`/portal/${token}`);
  return { ok: true, mensaje: "¡Gracias! Tu cotización fue confirmada." };
}

export async function pedirCambiosAction(
  _prev: PortalActionState,
  formData: FormData
): Promise<PortalActionState> {
  const token = String(formData.get("token"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!TokenSchema.safeParse(token).success) return { error: "Enlace inválido" };
  if (motivo.length < 5) return { error: "Describe brevemente los cambios." };
  const lim = await limitarPortal();
  if (lim) return { error: lim };

  const res = await solicitarCambiosPorToken(token, motivo);
  if (!res.ok) return { error: res.error };
  revalidatePath(`/portal/${token}`);
  return { ok: true, mensaje: "Recibimos tu solicitud de cambios." };
}
