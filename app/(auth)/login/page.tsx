"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-secondary px-6">
      <div className="absolute right-5 top-5">
        <ThemeSwitcher />
      </div>
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            JSM Flow
          </p>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Accede al panel de operación de la agencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="w-full rounded-lg border border-dashed bg-card/50 p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "linear-gradient(135deg,#7c3aed,#c026d3)" }}
          />
          Esta versión incluye Live-Dev
        </p>
        Dentro de la app verás un botón{" "}
        <span className="font-medium text-foreground">● Live-Dev</span> junto al
        Copiloto. Te deja señalar cualquier parte de la pantalla y enviar un
        comentario: se convierte en una tarea para el equipo. Úsalo si algo no se
        ve bien o no funciona.
      </div>
      </div>
    </main>
  );
}
