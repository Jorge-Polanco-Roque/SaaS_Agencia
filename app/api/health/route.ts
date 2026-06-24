import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Healthcheck para monitoreo/uptime. No expone secretos, solo presencia. */
export async function GET() {
  const env = {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    openai: Boolean(process.env.OPENAI_API_KEY),
    email: Boolean(process.env.RESEND_API_KEY),
    whatsapp: Boolean(process.env.WHATSAPP_TOKEN),
  };
  return NextResponse.json({
    ok: true,
    service: "jsm-flow",
    env,
  });
}
