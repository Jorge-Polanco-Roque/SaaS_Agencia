import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoneda } from "@/lib/services/calculos";
import { resumenPagos } from "@/lib/services/finanzas";
import { calcularLiquidacion } from "@/lib/services/liquidacion";
import { accionesOCDisponibles } from "@/lib/services/compras";
import { OcAcciones } from "./oc-acciones";
import { DispersionForm } from "./dispersion-form";
import { ProgressRing } from "@/components/charts/progress-ring";
import { SEMANTIC } from "@/components/charts/palette";
import { registrarFacturaAction, registrarPagoAction } from "../actions";

export default async function OcDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("compras.gestionar");
  const { id } = await params;
  const db = await createClient();

  const { data: oc } = await db
    .from("ordenes_compra")
    .select("*, proveedores(nombre), proyectos(nombre)")
    .eq("id", id)
    .single();
  if (!oc) notFound();

  const prov = Array.isArray(oc.proveedores) ? oc.proveedores[0] : oc.proveedores;
  const proy = Array.isArray(oc.proyectos) ? oc.proyectos[0] : oc.proyectos;

  const [{ data: items }, { data: pagos }, { data: facturas }] = await Promise.all([
    db.from("orden_compra_items").select("*").eq("orden_compra_id", id).order("orden"),
    db.from("pagos").select("*").eq("orden_compra_id", id).order("fecha", { ascending: false }),
    db.from("facturas").select("*").eq("orden_compra_id", id).order("created_at", { ascending: false }),
  ]);

  const resumen = resumenPagos(oc.total, pagos ?? []);
  const liquidacion = calcularLiquidacion(pagos ?? []);
  const tieneLiquidacion = (pagos ?? []).some((p) => p.concepto);
  const acciones = accionesOCDisponibles(oc.estado);

  return (
    <div>
      <PageHeader
        titulo={`OC ${oc.folio ?? "(borrador)"}`}
        descripcion={`${prov?.nombre ?? "—"}${proy ? ` · ${proy.nombre}` : ""}`}
      >
        <Link href="/compras" className="text-sm text-primary hover:underline">
          ← Volver
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge>{oc.estado}</Badge>
        <span className="text-sm text-muted-foreground">
          Total {formatMoneda(oc.total)} · Pagado {formatMoneda(resumen.pagado)} ·{" "}
          <span className={resumen.liquidado ? "text-emerald-600" : "text-amber-600"}>
            Saldo {formatMoneda(resumen.saldo)}
          </span>
        </span>
      </div>

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
                    <TH className="text-right">Importe</TH>
                  </TR>
                </THead>
                <TBody>
                  {items?.map((it) => (
                    <TR key={it.id}>
                      <TD className="font-medium">{it.descripcion}</TD>
                      <TD className="text-right">{it.cantidad} {it.unidad}</TD>
                      <TD className="text-right">{formatMoneda(it.costo_unitario)}</TD>
                      <TD className="text-right font-medium">{formatMoneda(it.importe)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <div className="mt-3 text-right text-sm">
                Subtotal {formatMoneda(oc.subtotal)} · IVA {formatMoneda(oc.iva)} ·{" "}
                <span className="font-bold">Total {formatMoneda(oc.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pagos ({pagos?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {pagos && pagos.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Fecha</TH>
                      <TH>Tipo</TH>
                      <TH>Referencia</TH>
                      <TH className="text-right">Monto</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {pagos.map((p) => (
                      <TR key={p.id}>
                        <TD>{p.fecha}</TD>
                        <TD>{p.tipo}</TD>
                        <TD className="text-muted-foreground">{p.referencia ?? "—"}</TD>
                        <TD className="text-right font-medium">{formatMoneda(p.monto)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin pagos.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facturas ({facturas?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {facturas && facturas.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Folio</TH>
                      <TH>Tipo</TH>
                      <TH>UUID SAT</TH>
                      <TH className="text-right">Monto</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {facturas.map((f) => (
                      <TR key={f.id}>
                        <TD className="font-mono text-xs">{f.folio}</TD>
                        <TD>{f.tipo}</TD>
                        <TD className="font-mono text-xs text-muted-foreground">
                          {f.uuid_sat ?? "—"}
                        </TD>
                        <TD className="text-right font-medium">{formatMoneda(f.monto)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin facturas.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Saldo</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <ProgressRing
                value={resumen.pagado}
                max={Math.max(1, resumen.total)}
                color={resumen.liquidado ? SEMANTIC.success : SEMANTIC.primary}
                label="pagado"
              />
              <div className="text-sm">
                <p className="text-muted-foreground">Pagado</p>
                <p className="font-semibold">{formatMoneda(resumen.pagado)}</p>
                <p className="mt-1 text-muted-foreground">Saldo</p>
                <p className={resumen.liquidado ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                  {formatMoneda(resumen.saldo)}
                </p>
              </div>
            </CardContent>
          </Card>

          {tieneLiquidacion && (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle>Liquidación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Anticipo</span>
                  <span>{formatMoneda(liquidacion.porConcepto.anticipo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Traspaso</span>
                  <span>{formatMoneda(liquidacion.porConcepto.traspaso)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Abono</span>
                  <span>{formatMoneda(liquidacion.porConcepto.abono)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">− Depósito</span>
                  <span>{formatMoneda(liquidacion.porConcepto.deposito)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">− Entrega $</span>
                  <span>{formatMoneda(liquidacion.porConcepto.entrega)}</span>
                </div>
                <hr className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span>Neto</span>
                  <span>{formatMoneda(liquidacion.neto)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <OcAcciones ocId={id} acciones={acciones} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dispersión (Tiempo × días)</CardTitle>
            </CardHeader>
            <CardContent>
              <DispersionForm ocId={id} total={oc.total} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registrar pago</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={registrarPagoAction} className="space-y-3">
                <input type="hidden" name="orden_compra_id" value={id} />
                <div className="space-y-1.5">
                  <Label htmlFor="pg_tipo">Tipo</Label>
                  <Select id="pg_tipo" name="tipo" defaultValue="abono">
                    <option value="anticipo">Anticipo</option>
                    <option value="dispersion">Dispersión</option>
                    <option value="liquidacion">Liquidación</option>
                    <option value="abono">Abono</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pg_concepto">Concepto (liquidación)</Label>
                  <Select id="pg_concepto" name="concepto" defaultValue="">
                    <option value="">— Sin concepto —</option>
                    <option value="anticipo">Anticipo (+)</option>
                    <option value="traspaso">Traspaso (+)</option>
                    <option value="deposito">Depósito (−)</option>
                    <option value="entrega">Entrega $ (−)</option>
                    <option value="abono">Abono (+)</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pg_monto">Monto *</Label>
                  <Input id="pg_monto" name="monto" type="number" step="0.01" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pg_ref">Referencia</Label>
                  <Input id="pg_ref" name="referencia" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pg_comp">Comprobante (URL)</Label>
                  <Input id="pg_comp" name="comprobante_url" />
                </div>
                <SubmitButton className="w-full">Registrar pago</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registrar factura</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={registrarFacturaAction} className="space-y-3">
                <input type="hidden" name="orden_compra_id" value={id} />
                <input type="hidden" name="tipo" value="recibida_proveedor" />
                {oc.proveedor_id && (
                  <input type="hidden" name="proveedor_id" value={oc.proveedor_id} />
                )}
                {oc.proyecto_id && (
                  <input type="hidden" name="proyecto_id" value={oc.proyecto_id} />
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="f_folio">Folio *</Label>
                  <Input id="f_folio" name="folio" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f_uuid">UUID SAT</Label>
                  <Input id="f_uuid" name="uuid_sat" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f_monto">Monto</Label>
                  <Input id="f_monto" name="monto" type="number" step="0.01" defaultValue={oc.total} />
                </div>
                <SubmitButton className="w-full">Registrar factura</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
