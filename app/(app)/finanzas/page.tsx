import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoneda, round2 } from "@/lib/services/calculos";
import { resumenCobranza } from "@/lib/services/finanzas";
import { agingCobranza } from "@/lib/services/dashboard";
import { Donut } from "@/components/charts/donut";
import { BarChart } from "@/components/charts/bar-chart";
import { CountUp } from "@/components/charts/count-up";
import { SERIE, SEMANTIC } from "@/components/charts/palette";
import {
  cobrarFacturaForm,
  crearSolicitudPagoAction,
  registrarFacturaClienteAction,
  resolverSolicitudForm,
} from "./actions";
import { CobranzaButton } from "./cobranza-button";

const SOLICITUD_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "danger"
> = {
  pendiente: "warning",
  autorizada: "default",
  rechazada: "danger",
  pagada: "success",
};

export default async function FinanzasPage() {
  const user = await requireCapability("finanzas.gestionar");
  const puedeAutorizar = can(user.rol, "pago.autorizar");
  const db = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [
    { data: solicitudes },
    { data: facturas },
    { data: proyectos },
    { data: proveedores },
    { data: clientes },
  ] = await Promise.all([
    db
      .from("solicitudes_pago")
      .select("*, proveedores(nombre)")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("facturas")
      .select("*, clientes(nombre)")
      .eq("tipo", "emitida_cliente")
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("proyectos").select("id, nombre").order("created_at", { ascending: false }),
    db.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    db.from("clientes").select("id, nombre").order("nombre"),
  ]);

  const cobranza = resumenCobranza(
    (facturas ?? []).map((f) => ({
      monto: f.monto,
      estado: f.estado,
      fecha_vencimiento: f.fecha_vencimiento,
    })),
    hoy
  );

  return (
    <div className="space-y-10">
      <PageHeader
        titulo="Finanzas"
        descripcion="Solicitudes de pago, autorización y cobranza."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <ResumenCard titulo="Por cobrar" valor={cobranza.porCobrar} />
          <ResumenCard titulo="Vencido" valor={cobranza.vencido} alerta />
          <ResumenCard titulo="Cobrado" valor={cobranza.cobrado} />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle>Estado de la cartera</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-8">
            <Donut
              size={150}
              centerValue={formatMoneda(cobranza.porCobrar)}
              centerLabel="por cobrar"
              data={[
                {
                  label: `Al corriente · ${formatMoneda(round2(cobranza.porCobrar - cobranza.vencido))}`,
                  value: round2(cobranza.porCobrar - cobranza.vencido),
                  color: SERIE[0],
                },
                { label: `Vencido · ${formatMoneda(cobranza.vencido)}`, value: cobranza.vencido, color: SEMANTIC.danger },
                { label: `Cobrado · ${formatMoneda(cobranza.cobrado)}`, value: cobranza.cobrado, color: SEMANTIC.success },
              ]}
            />
            <div className="min-w-[220px] flex-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Antigüedad de saldos
              </p>
              <BarChart
                data={agingCobranza(facturas ?? [], hoy).map((a, i) => ({
                  label: a.label,
                  value: a.monto,
                  color: i === 0 ? SERIE[0] : i < 3 ? SEMANTIC.warning : SEMANTIC.danger,
                }))}
                valueFormat="money"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solicitudes de pago */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de pago</CardTitle>
            <CardDescription>
              Anticipos, liquidaciones y pagos a proveedores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {solicitudes && solicitudes.length > 0 ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Concepto</TH>
                    <TH>Tipo</TH>
                    <TH>Estado</TH>
                    <TH className="text-right">Monto</TH>
                    {puedeAutorizar && <TH />}
                  </TR>
                </THead>
                <TBody>
                  {solicitudes.map((s) => (
                    <TR key={s.id}>
                      <TD className="font-medium">{s.concepto}</TD>
                      <TD className="text-muted-foreground">{s.tipo}</TD>
                      <TD>
                        <Badge variant={SOLICITUD_VARIANT[s.estado] ?? "secondary"}>
                          {s.estado}
                        </Badge>
                      </TD>
                      <TD className="text-right font-medium">{formatMoneda(s.monto)}</TD>
                      {puedeAutorizar && (
                        <TD className="text-right">
                          {s.estado === "pendiente" && (
                            <div className="flex justify-end gap-2">
                              <form action={resolverSolicitudForm}>
                                <input type="hidden" name="solicitud_id" value={s.id} />
                                <input type="hidden" name="decision" value="si" />
                                <SubmitButton size="sm">Autorizar</SubmitButton>
                              </form>
                              <form action={resolverSolicitudForm}>
                                <input type="hidden" name="solicitud_id" value={s.id} />
                                <input type="hidden" name="decision" value="no" />
                                <SubmitButton size="sm" variant="outline">
                                  Rechazar
                                </SubmitButton>
                              </form>
                            </div>
                          )}
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin solicitudes.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nueva solicitud</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={crearSolicitudPagoAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="s_concepto">Concepto *</Label>
                <Input id="s_concepto" name="concepto" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s_tipo">Tipo</Label>
                  <Select id="s_tipo" name="tipo" defaultValue="pago_unico">
                    <option value="anticipo">Anticipo</option>
                    <option value="liquidacion">Liquidación</option>
                    <option value="pago_unico">Pago único</option>
                    <option value="reembolso">Reembolso</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s_monto">Monto *</Label>
                  <Input id="s_monto" name="monto" type="number" step="0.01" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s_prov">Proveedor</Label>
                <Select id="s_prov" name="proveedor_id" defaultValue="">
                  <option value="">— Ninguno —</option>
                  {proveedores?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s_proy">Proyecto</Label>
                <Select id="s_proy" name="proyecto_id" defaultValue="">
                  <option value="">— Ninguno —</option>
                  {proyectos?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s_fecha">Fecha requerida</Label>
                <Input id="s_fecha" name="fecha_requerida" type="date" />
              </div>
              <SubmitButton className="w-full">Crear solicitud</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>

      {/* Cobranza */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cobranza</h2>
        <CobranzaButton />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Cobranza · Facturas a cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {facturas && facturas.length > 0 ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Folio</TH>
                    <TH>Cliente</TH>
                    <TH>Vence</TH>
                    <TH>Estado</TH>
                    <TH className="text-right">Monto</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {facturas.map((f) => {
                    const cliente = Array.isArray(f.clientes)
                      ? f.clientes[0]
                      : f.clientes;
                    const vencida =
                      f.estado === "registrada" &&
                      f.fecha_vencimiento &&
                      f.fecha_vencimiento < hoy;
                    return (
                      <TR key={f.id}>
                        <TD className="font-mono text-xs">{f.folio}</TD>
                        <TD>{cliente?.nombre ?? "—"}</TD>
                        <TD className={vencida ? "text-destructive" : "text-muted-foreground"}>
                          {f.fecha_vencimiento ?? "—"}
                        </TD>
                        <TD>
                          <Badge variant={f.estado === "pagada" ? "success" : "warning"}>
                            {f.estado === "pagada" ? "Cobrada" : "Pendiente"}
                          </Badge>
                        </TD>
                        <TD className="text-right font-medium">{formatMoneda(f.monto)}</TD>
                        <TD className="text-right">
                          {f.estado === "registrada" && (
                            <form action={cobrarFacturaForm}>
                              <input type="hidden" name="factura_id" value={f.id} />
                              <SubmitButton size="sm" variant="outline">
                                Marcar cobrada
                              </SubmitButton>
                            </form>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin facturas emitidas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Registrar factura a cliente</CardTitle>
            <CardDescription>Registro/integración (no timbra).</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={registrarFacturaClienteAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fc_cliente">Cliente</Label>
                <Select id="fc_cliente" name="cliente_id" defaultValue="">
                  <option value="">— Ninguno —</option>
                  {clientes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fc_proy">Proyecto</Label>
                <Select id="fc_proy" name="proyecto_id" defaultValue="">
                  <option value="">— Ninguno —</option>
                  {proyectos?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fc_folio">Folio *</Label>
                <Input id="fc_folio" name="folio" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fc_monto">Monto</Label>
                  <Input id="fc_monto" name="monto" type="number" step="0.01" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fc_vence">Vence</Label>
                  <Input id="fc_vence" name="fecha_vencimiento" type="date" />
                </div>
              </div>
              <SubmitButton className="w-full">Registrar factura</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
  alerta,
}: {
  titulo: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className={alerta ? "text-3xl text-destructive" : "text-3xl"}>
          <CountUp value={valor} format="money" />
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
