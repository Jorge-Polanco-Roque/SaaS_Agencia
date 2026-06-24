"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/input";
import { pullAction, type PullResult } from "../actions";

export function PullClient() {
  const [pending, start] = useTransition();
  const [requisicion, setRequisicion] = useState("");
  const [prioridad, setPrioridad] = useState("balance");
  const [res, setRes] = useState<PullResult | null>(null);

  function ejecutar() {
    start(async () => {
      const r = await pullAction({ requisicion, prioridad });
      setRes(r);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Requisición</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={requisicion}
            onChange={(e) => setRequisicion(e.target.value)}
            placeholder="Ej: 300 termos con logo para entrega en 10 días en Monterrey."
          />
          <div className="space-y-1.5">
            <Label>Prioridad</Label>
            <Select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
              <option value="balance">Balance (tiempo y costo)</option>
              <option value="tiempo">Tiempo de entrega</option>
              <option value="costo">Costo</option>
            </Select>
          </div>
          <Button onClick={ejecutar} disabled={pending}>
            {pending ? "Analizando…" : "Buscar proveedores"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {res?.error && <p className="text-sm text-destructive">{res.error}</p>}
          {res?.resumen && (
            <p className="text-sm text-muted-foreground">{res.resumen}</p>
          )}
          {res?.recomendaciones?.length ? (
            <ol className="space-y-2">
              {res.recomendaciones.map((r, i) => (
                <li key={r.proveedor_id} className="rounded-md border bg-secondary/30 p-3">
                  <p className="text-sm font-medium">
                    {i + 1}. {r.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.razon}</p>
                </li>
              ))}
            </ol>
          ) : (
            !res?.error && (
              <p className="text-sm text-muted-foreground">
                Describe la requisición para obtener recomendaciones.
              </p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
