"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import {
  confirmarAction,
  pedirCambiosAction,
  type PortalActionState,
} from "./actions";

export function PortalDecision({ token }: { token: string }) {
  const router = useRouter();
  const [confirmando, startConfirm] = useTransition();
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [mostrarCambios, setMostrarCambios] = useState(false);
  const [cambiosState, cambiosAction] = useActionState<PortalActionState, FormData>(
    pedirCambiosAction,
    {}
  );

  function confirmar() {
    setConfirmErr(null);
    startConfirm(async () => {
      const res = await confirmarAction(token);
      if (res.error) setConfirmErr(res.error);
      else {
        setConfirmMsg(res.mensaje ?? "Confirmada");
        router.refresh();
      }
    });
  }

  if (confirmMsg) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        {confirmMsg}
      </div>
    );
  }
  if (cambiosState.ok) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        {cambiosState.mensaje}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button onClick={confirmar} disabled={confirmando} size="lg">
          {confirmando ? "Confirmando…" : "Confirmar cotización"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setMostrarCambios((v) => !v)}
        >
          Solicitar cambios
        </Button>
      </div>
      {confirmErr && <p className="text-sm text-destructive">{confirmErr}</p>}

      {mostrarCambios && (
        <form action={cambiosAction} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <Textarea
            name="motivo"
            placeholder="¿Qué te gustaría ajustar? (cantidades, fechas, precios…)"
            required
          />
          {cambiosState.error && (
            <p className="text-sm text-destructive">{cambiosState.error}</p>
          )}
          <Button type="submit" variant="secondary">
            Enviar solicitud
          </Button>
        </form>
      )}
    </div>
  );
}
