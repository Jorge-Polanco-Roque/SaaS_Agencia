"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { transicionOCAction } from "../actions";
import type { AccionOC } from "@/lib/services/compras";

export function OcAcciones({
  ocId,
  acciones,
}: {
  ocId: string;
  acciones: { accion: AccionOC; etiqueta: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (acciones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin acciones disponibles.</p>
    );
  }

  function ejecutar(accion: AccionOC) {
    setError(null);
    start(async () => {
      const res = await transicionOCAction(ocId, accion);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {acciones.map((a) => (
        <Button
          key={a.accion}
          variant={a.accion === "rechazar" || a.accion === "cancelar" ? "outline" : "default"}
          className="w-full"
          disabled={pending}
          onClick={() => ejecutar(a.accion)}
        >
          {a.etiqueta}
        </Button>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
