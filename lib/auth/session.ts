import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/database.types";
import { can, type Capability } from "./rbac";

export interface SessionUser {
  id: string;
  email: string | undefined;
  orgId: string;
  nombre: string;
  rol: AppRole;
}

/** Devuelve la sesión actual o null. Para uso en Server Components/Actions. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, nombre, rol")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email,
    orgId: profile.org_id,
    nombre: profile.nombre,
    rol: profile.rol,
  };
}

/** Exige sesión; redirige a /login si no hay. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Exige una capacidad; redirige a /dashboard si no la tiene. */
export async function requireCapability(cap: Capability): Promise<SessionUser> {
  const user = await requireSession();
  if (!can(user.rol, cap)) redirect("/dashboard");
  return user;
}
