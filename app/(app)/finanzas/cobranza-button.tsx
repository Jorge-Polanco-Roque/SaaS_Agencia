"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ejecutarCobranzaAction, type CobranzaState } from "./actions";

export function CobranzaButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<CobranzaState | null>(null);

  function ejecutar() {
    start(async () => {
      const r = await ejecutarCobranzaAction();
      setRes(r);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={ejecutar} disabled={pending}>
        {pending ? "Enviando…" : "Enviar recordatorios de cobranza"}
      </Button>
      {res?.error && <span className="text-sm text-destructive">{res.error}</span>}
      {res?.resumen && (
        <span className="text-sm text-muted-foreground">
          {res.resumen.total} vencidas · {res.resumen.enviados} enviados ·{" "}
          {res.resumen.simulados} simulados · {res.resumen.fallidos} fallidos ·{" "}
          {res.resumen.sinContacto} sin contacto
        </span>
      )}
    </div>
  );
}
