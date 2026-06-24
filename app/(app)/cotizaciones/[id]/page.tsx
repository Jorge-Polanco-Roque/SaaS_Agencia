import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoneda } from "@/lib/services/calculos";
import {
  ESTADO_LABELS,
  transicionesDisponibles,
} from "@/lib/services/state-machine";
import { transicionFormAction } from "../actions";

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSession();
  if (!can(user.rol, "cotizacion.ver_costos")) notFound();
  const { id } = await params;
  const db = await createClient();

  const { data: cot } = await db
    .from("cotizaciones")
    .select("*, clientes(nombre, email)")
    .eq("id", id)
    .single();
  if (!cot) notFound();

  const cliente = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes;

  const [{ data: items }, { data: eventos }, { data: versiones }] =
    await Promise.all([
      db
        .from("cotizacion_items")
        .select("*")
        .eq("cotizacion_id", id)
        .order("orden"),
      db
        .from("bitacora")
        .select("*")
        .eq("entidad", "cotizacion")
        .eq("entidad_id", id)
        .order("created_at", { ascending: false }),
      db
        .from("cotizacion_versiones")
        .select("version, motivo, created_at")
        .eq("cotizacion_id", id)
        .order("version", { ascending: false }),
    ]);

  const acciones = transicionesDisponibles(cot.estado, user.rol);

  return (
    <div>
      <PageHeader
        titulo={cot.titulo}
        descripcion={`${cliente?.nombre ?? "—"} · v${cot.version}`}
      >
        <Link href="/cotizaciones" className="text-sm text-primary hover:underline">
          ← Volver
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge>{ESTADO_LABELS[cot.estado]}</Badge>
        <span className="font-mono text-sm text-muted-foreground">
          {cot.folio ?? "Folio pendiente (se asigna al validar)"}
        </span>
        <div className="ml-auto flex gap-2">
          <a
            href={`/cotizaciones/${id}/pdf`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            PDF
          </a>
          <a
            href={`/cotizaciones/${id}/excel`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Excel
          </a>
          {(cot.estado === "enviada_cliente" ||
            cot.estado === "en_negociacion") && (
            <Link
              href={`/cotizaciones/${id}/version`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Nueva versión
            </Link>
          )}
        </div>
      </div>

      {cot.portal_token && (
        <Card className="mb-4 border-accent/40 bg-accent/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-4 text-sm">
            <span className="font-medium text-accent">Portal del cliente:</span>
            <code className="rounded bg-secondary px-2 py-1 text-xs">
              /portal/{cot.portal_token}
            </code>
            <span className="text-muted-foreground">
              Comparte este enlace para que el cliente confirme o pida cambios.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Partidas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <THead>
                  <TR>
                    <TH>Descripción</TH>
                    <TH className="text-right">Cant.</TH>
                    <TH className="text-right">Costo</TH>
                    <TH className="text-right">Precio</TH>
                    <TH className="text-right">Importe</TH>
                  </TR>
                </THead>
                <TBody>
                  {items?.map((it) => (
                    <TR key={it.id}>
                      <TD className="font-medium">{it.descripcion}</TD>
                      <TD className="text-right">
                        {it.cantidad} {it.unidad}
                      </TD>
                      <TD className="text-right text-muted-foreground">
                        {formatMoneda(it.costo_unitario)}
                      </TD>
                      <TD className="text-right">
                        {formatMoneda(it.precio_unitario)}
                      </TD>
                      <TD className="text-right font-medium">
                        {formatMoneda(it.importe)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                <Row label="Subtotal" value={formatMoneda(cot.subtotal)} />
                {cot.descuento > 0 && (
                  <Row label="Descuento" value={`- ${formatMoneda(cot.descuento)}`} />
                )}
                <Row
                  label={`IVA (${Math.round(cot.iva_tasa * 100)}%)`}
                  value={formatMoneda(cot.iva)}
                />
                <Row label="Total" value={formatMoneda(cot.total)} strong />
                <div className="mt-1 text-xs text-muted-foreground">
                  Costo {formatMoneda(cot.costo_total)} · Margen{" "}
                  {formatMoneda(cot.margen)}
                </div>
              </div>
            </CardContent>
          </Card>

          {cot.notas && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {cot.notas}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {acciones.length > 0 ? (
                acciones.map((a) => (
                  <form key={a.transicion} action={transicionFormAction}>
                    <input type="hidden" name="cotizacion_id" value={id} />
                    <input
                      type="hidden"
                      name="transicion"
                      value={a.transicion}
                    />
                    <SubmitButton
                      variant={
                        a.transicion === "rechazar" || a.transicion === "cancelar"
                          ? "outline"
                          : "default"
                      }
                      className="w-full"
                    >
                      {a.etiqueta}
                    </SubmitButton>
                  </form>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin acciones disponibles para tu rol en este estado.
                </p>
              )}
            </CardContent>
          </Card>

          {versiones && versiones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Versiones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {versiones.map((v) => (
                  <div key={v.version} className="flex justify-between">
                    <span className="font-medium">v{v.version}</span>
                    <span className="text-muted-foreground">
                      {v.motivo ?? "—"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Trazabilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {eventos?.map((e) => (
                <div key={e.id} className="text-sm">
                  <p className="font-medium">
                    {e.accion}
                    {e.estado_nuevo ? ` → ${e.estado_nuevo}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("es-MX")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex w-48 justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-bold" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
