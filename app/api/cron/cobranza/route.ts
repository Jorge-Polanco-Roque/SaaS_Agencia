import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ejecutarCobranza } from "@/lib/services/cobranza";

export const runtime = "nodejs";

/**
 * Barrido de cobranza para TODAS las organizaciones. Protegido por CRON_SECRET.
 * Programar (p.ej.) diario con Vercel Cron, Cloud Scheduler o Trigger.dev.
 *
 * Cloud Run reserva el header `Authorization: Bearer` para su IAM, así que también
 * se acepta el secreto vía `X-Cron-Secret` (lo usa Cloud Scheduler).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-cron-secret");
  const autorizado =
    !!secret && (auth === `Bearer ${secret}` || cronHeader === secret);
  if (!autorizado) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const db = createAdminClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: orgs } = await db.from("organizations").select("id");

  const resultados: Record<string, unknown> = {};
  for (const o of orgs ?? []) {
    try {
      resultados[o.id] = await ejecutarCobranza(db, o.id, hoy);
    } catch (e) {
      resultados[o.id] = { error: e instanceof Error ? e.message : "Error" };
    }
  }

  return NextResponse.json({ ok: true, fecha: hoy, resultados });
}
