import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Verificación del webhook (Meta envía un challenge en el alta). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** Recepción de mensajes entrantes / estados. Se ACK siempre con 200. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // En Fase 4 solo registramos; el enrutado a conversaciones es trabajo futuro.
    console.info("[whatsapp:webhook]", JSON.stringify(body).slice(0, 500));
  } catch {
    // ignora cuerpos no-JSON
  }
  return NextResponse.json({ received: true });
}
