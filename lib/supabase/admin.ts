import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente con service_role. SOLO en servidor (Server Actions / route handlers / jobs).
 * Omite RLS — usar exclusivamente para operaciones de sistema (consecutivos atómicos,
 * webhooks, seeds). Nunca importar desde código que llegue al cliente.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
