"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { calcularDispersion } from "@/lib/services/dispersion";
import { formatMoneda } from "@/lib/services/calculos";
import { programarDispersionAction } from "../actions";

/** Programa la dispersión "Tiempo × días" de una OC en N parcialidades. */
export function DispersionForm({ ocId, total }: { ocId: string; total: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [parcialidades, setParcialidades] = useState(3);
  const [diasEntre, setDiasEntre] = useState(30);

  const preview = useMemo(
    () => calcularDispersion(total, { parcialidades, diasEntre, fechaInicio: "—" }),
    [total, parcialidades, diasEntre]
  );

  function ejecutar() {
    setError(null);
    setOk(false);
    start(async () => {
      const res = await programarDispersionAction(ocId, parcialidades, diasEntre);
      if (res.error) setError(res.error);
      else {
        setOk(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="disp_n">Parcialidades</Label>
          <Input
            id="disp_n"
            type="number"
            min="1"
            max="36"
            value={parcialidades}
            onChange={(e) =>
              setParcialidades(Math.max(1, Math.floor(Number(e.target.value) || 1)))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="disp_d">Días entre pagos</Label>
          <Input
            id="disp_d"
            type="number"
            min="0"
            value={diasEntre}
            onChange={(e) => setDiasEntre(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          />
        </div>
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {preview.map((p) => (
          <li key={p.numero} className="flex justify-between">
            <span>{p.concepto}</span>
            <span className="font-medium text-foreground">{formatMoneda(p.monto)}</span>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok && <p className="text-sm text-emerald-600">Dispersión programada como solicitudes de pago.</p>}
      <Button className="w-full" disabled={pending || total <= 0} onClick={ejecutar}>
        {pending ? "Programando…" : "Programar dispersión"}
      </Button>
    </div>
  );
}
