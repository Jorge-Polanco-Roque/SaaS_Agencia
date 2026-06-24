import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Cliente Supabase tipado. Sirve tanto para el cliente de sesión como el admin. */
export type DbClient = SupabaseClient<Database>;
