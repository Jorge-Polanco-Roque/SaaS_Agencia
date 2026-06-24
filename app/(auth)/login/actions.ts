"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { consume } from "@/lib/security/rate-limit";
import { clienteKey } from "@/lib/security/request-key";

const LoginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  // Anti fuerza bruta: N intentos por minuto por IP (configurable; 8 por defecto)
  const maxPorMin = Number(process.env.LOGIN_MAX_PER_MIN) || 8;
  const limite = consume(await clienteKey("login"), maxPorMin, 60_000);
  if (!limite.ok) {
    return {
      error: `Demasiados intentos. Espera ${Math.ceil(limite.resetEnMs / 1000)}s.`,
    };
  }

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Credenciales incorrectas" };
  }

  redirect("/dashboard");
}
