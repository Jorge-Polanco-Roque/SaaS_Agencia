import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          JSM Flow
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Cotiza, ejecuta y cobra <br className="hidden sm:block" />
          sin perder el hilo.
        </h1>
        <p className="mx-auto max-w-xl text-pretty text-muted-foreground">
          Plataforma de operación para agencia de promocionales y eventos:
          cotizaciones con consecutivo, proyectos, compras, pagos y cobranza
          con asistencia de agentes de IA.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Entrar
        </Link>
        <Link
          href="/dashboard"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Ir al panel
        </Link>
      </div>
    </main>
  );
}
