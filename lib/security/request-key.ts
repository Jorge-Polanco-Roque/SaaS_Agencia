import { headers } from "next/headers";

/** Deriva una clave de cliente (IP) para rate limiting desde los headers. */
export async function clienteKey(prefijo: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconocido";
  return `${prefijo}:${ip}`;
}
