import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoneda } from "@/lib/services/calculos";
import { getCotizacionPorToken } from "@/lib/services/portal";
import { ESTADO_LABELS } from "@/lib/services/state-machine";
import type { CotizacionEstado } from "@/lib/supabase/database.types";
import { PortalDecision } from "./decision";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cot = await getCotizacionPorToken(token);
  if (!cot) notFound();

  const m = (n: number) => formatMoneda(n, cot.moneda);
  const estadoLabel =
    ESTADO_LABELS[cot.estado as CotizacionEstado] ?? cot.estado;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{cot.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            Cotización {cot.folio} · {cot.fecha}
          </p>
        </div>
        <Badge variant={cot.estado === "confirmada" ? "success" : "default"}>
          {estadoLabel}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Para {cot.cliente.nombre}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Concepto</TH>
                <TH className="text-right">Cantidad</TH>
                <TH className="text-right">Precio</TH>
                <TH className="text-right">Importe</TH>
              </TR>
            </THead>
            <TBody>
              {cot.items.map((it, i) => (
                <TR key={i}>
                  <TD className="font-medium">{it.descripcion}</TD>
                  <TD className="text-right">
                    {it.cantidad} {it.unidad}
                  </TD>
                  <TD className="text-right">{m(it.precio_unitario)}</TD>
                  <TD className="text-right font-medium">{m(it.importe)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <Linea label="Subtotal" value={m(cot.subtotal)} />
            {cot.descuento > 0 && (
              <Linea label="Descuento" value={`- ${m(cot.descuento)}`} />
            )}
            <Linea
              label={`IVA (${Math.round(cot.iva_tasa * 100)}%)`}
              value={m(cot.iva)}
            />
            <Linea label="Total" value={m(cot.total)} strong />
          </div>

          {cot.notas && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {cot.notas}
            </p>
          )}
        </CardContent>
      </Card>

      {cot.puedeDecidir ? (
        <Card>
          <CardHeader>
            <CardTitle>¿Aprobamos?</CardTitle>
          </CardHeader>
          <CardContent>
            <PortalDecision token={token} />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          {cot.estado === "confirmada"
            ? "Esta cotización ya fue confirmada. ¡Gracias!"
            : "Esta cotización está en proceso. Nuestro equipo te contactará."}
        </div>
      )}
    </div>
  );
}

function Linea({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex w-56 justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-bold" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
