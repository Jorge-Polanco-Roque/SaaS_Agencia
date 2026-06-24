import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { correrCopiloto, resolverInterrupcion } from "@/lib/agents/copiloto";

export const runtime = "nodejs";

const BodySchema = z.object({
  seccion: z.string().default("general"),
  thread_id: z.string().optional(),
  mensaje: z.string().optional(),
  accion: z.enum(["approve", "reject"]).optional(),
  interrupciones: z.number().int().min(1).max(10).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }
  const { seccion, accion } = parsed.data;
  const threadId = parsed.data.thread_id ?? crypto.randomUUID();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      sinClave: true,
      thread_id: threadId,
      error: "El copiloto necesita OPENAI_API_KEY. Agrégala a .env.local y reinicia.",
    });
  }

  const db = await createClient();

  // Registra/actualiza la conversación (para listarla en la UI)
  if (!parsed.data.thread_id) {
    await db.from("conversaciones").insert({
      org_id: user.orgId,
      user_id: user.id,
      seccion,
      titulo: parsed.data.mensaje?.slice(0, 80) ?? "Conversación",
      thread_id: threadId,
    });
  } else {
    await db
      .from("conversaciones")
      .update({ updated_at: new Date().toISOString() })
      .eq("thread_id", threadId);
  }

  try {
    const respuesta = accion
      ? await resolverInterrupcion(db, user, seccion, threadId, accion, parsed.data.interrupciones)
      : await correrCopiloto(db, user, seccion, threadId, parsed.data.mensaje ?? "");
    return NextResponse.json({ ok: true, thread_id: threadId, ...respuesta });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      thread_id: threadId,
      error: e instanceof Error ? e.message : "Error del copiloto",
    });
  }
}
