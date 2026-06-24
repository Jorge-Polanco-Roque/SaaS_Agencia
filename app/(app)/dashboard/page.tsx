import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoneda, round2 } from "@/lib/services/calculos";
import {
  agingCobranza,
  construirDashboard,
  embudoFlujo,
  serieMensualIngresos,
} from "@/lib/services/dashboard";
import { detectarAnomalias, type NivelAlerta } from "@/lib/services/control-flujo";
import { CountUp } from "@/components/charts/count-up";
import { Sparkline } from "@/components/charts/sparkline";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { Donut } from "@/components/charts/donut";
import { FlujoRibbon } from "@/components/charts/flujo-ribbon";
import { SERIE, SEMANTIC } from "@/components/charts/palette";

const NIVEL_VARIANT: Record<NivelAlerta, "danger" | "warning" | "secondary"> = {
  alta: "danger",
  media: "warning",
  baja: "secondary",
};

const moneyShort = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k`
    : `$${Math.round(n)}`;

export default async function DashboardPage() {
  const user = await requireSession();
  const db = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [
    { data: cotizaciones },
    { data: proyectos },
    { data: tareas },
    { data: ocs },
    { data: pagos },
    { data: facturas },
  ] = await Promise.all([
    db
      .from("cotizaciones")
      .select("id, folio, titulo, estado, total, cliente_id, enviada_at, created_at, clientes(nombre)"),
    db.from("proyectos").select("id, nombre, estado"),
    db.from("tareas").select("proyecto_id"),
    db.from("ordenes_compra").select("id, folio, estado, total, autorizada_at"),
    db.from("pagos").select("id, monto, orden_compra_id"),
    db.from("facturas").select("id, folio, tipo, estado, monto, fecha_vencimiento"),
  ]);

  const cots = (cotizaciones ?? []).map((c) => {
    const cli = Array.isArray(c.clientes) ? c.clientes[0] : c.clientes;
    return {
      id: c.id,
      folio: c.folio,
      titulo: c.titulo,
      estado: c.estado,
      total: c.total,
      cliente_id: c.cliente_id,
      cliente_nombre: cli?.nombre ?? "—",
      enviada_at: c.enviada_at,
      created_at: c.created_at,
    };
  });

  const kpis = construirDashboard(
    {
      cotizaciones: cots,
      proyectos: proyectos ?? [],
      ocs: ocs ?? [],
      pagos: pagos ?? [],
      facturas: facturas ?? [],
    },
    hoy
  );
  const serie = serieMensualIngresos(cots, hoy, 6);
  const etapas = embudoFlujo({
    cotizaciones: cots,
    proyectos: proyectos ?? [],
    ocs: ocs ?? [],
    pagos: pagos ?? [],
    facturas: facturas ?? [],
  });
  const aging = agingCobranza(facturas ?? [], hoy);

  // saldo por OC + tareas por proyecto (control de flujo)
  const pagosPorOC = new Map<string, number>();
  for (const p of pagos ?? []) {
    if (!p.orden_compra_id) continue;
    pagosPorOC.set(p.orden_compra_id, round2((pagosPorOC.get(p.orden_compra_id) ?? 0) + p.monto));
  }
  const tareasPorProyecto = new Map<string, number>();
  for (const t of tareas ?? [])
    tareasPorProyecto.set(t.proyecto_id, (tareasPorProyecto.get(t.proyecto_id) ?? 0) + 1);

  const alertas = detectarAnomalias(
    {
      cotizaciones: cots,
      ocs: (ocs ?? []).map((o) => ({
        id: o.id,
        folio: o.folio,
        estado: o.estado,
        saldo: round2(o.total - (pagosPorOC.get(o.id) ?? 0)),
        autorizada_at: o.autorizada_at,
      })),
      facturas: facturas ?? [],
      proyectos: (proyectos ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        estado: p.estado,
        num_tareas: tareasPorProyecto.get(p.id) ?? 0,
      })),
    },
    hoy
  );

  const corriente = round2(kpis.cobranza.porCobrar - kpis.cobranza.vencido);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Hola, {user.nombre.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Panel de {ROLE_LABELS[user.rol]} · JSM Flow
        </p>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Monto confirmado</CardDescription>
            <CardTitle className="text-3xl">
              <CountUp value={kpis.cotizaciones.montoConfirmado} format="money" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline data={serie.map((s) => s.monto)} color={SERIE[0]} className="w-full" />
          </CardContent>
        </Card>
        <KpiSimple titulo="Proyectos activos" valor={kpis.proyectos.activos} nota={`${kpis.proyectos.total} en total`} />
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Saldo a proveedores</CardDescription>
            <CardTitle className="text-3xl">
              <CountUp value={kpis.compras.saldo} format="money" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">OC {formatMoneda(kpis.compras.totalOC)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Por cobrar</CardDescription>
            <CardTitle className="text-3xl">
              <CountUp value={kpis.cobranza.porCobrar} format="money" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-destructive">
              Vencido {formatMoneda(kpis.cobranza.vencido)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flujo JSM (firma) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Flujo JSM</CardTitle>
          <CardDescription>
            Del pipeline a la cobranza, con conversión entre etapas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlujoRibbon etapas={etapas} />
        </CardContent>
      </Card>

      {/* Ingresos + Cobranza */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Ingresos confirmados</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart data={serie} color={SERIE[0]} valueFormat="moneyShort" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Cobranza</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut
              size={150}
              centerValue={moneyShort(kpis.cobranza.porCobrar)}
              centerLabel="por cobrar"
              data={[
                { label: `Al corriente · ${formatMoneda(corriente)}`, value: corriente, color: SERIE[0] },
                { label: `Vencido · ${formatMoneda(kpis.cobranza.vencido)}`, value: kpis.cobranza.vencido, color: SEMANTIC.danger },
                { label: `Cobrado · ${formatMoneda(kpis.cobranza.cobrado)}`, value: kpis.cobranza.cobrado, color: SEMANTIC.success },
              ]}
            />
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Antigüedad
              </p>
              <BarChart
                data={aging.map((a, i) => ({
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

      {/* Top clientes + Control de flujo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Top clientes</CardTitle>
            <CardDescription>Por monto confirmado</CardDescription>
          </CardHeader>
          <CardContent>
            {kpis.topClientes.length > 0 ? (
              <BarChart
                data={kpis.topClientes.map((c, i) => ({
                  label: c.nombre,
                  value: c.monto,
                  color: SERIE[i % SERIE.length],
                }))}
                valueFormat="money"
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay cotizaciones confirmadas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Control de flujo</CardTitle>
            <CardDescription>Pendientes y cuellos de botella</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertas.length > 0 ? (
              alertas.slice(0, 6).map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Badge variant={NIVEL_VARIANT[a.nivel]}>{a.nivel}</Badge>
                  <p className="text-sm">{a.mensaje}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Todo en orden. Sin alertas. ✅</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Embudo por estado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cotizaciones por estado</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(kpis.cotizaciones.porEstado).length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Estado</TH>
                  <TH className="text-right">Cantidad</TH>
                </TR>
              </THead>
              <TBody>
                {Object.entries(kpis.cotizaciones.porEstado).map(([estado, n]) => (
                  <TR key={estado}>
                    <TD>
                      <Link href="/cotizaciones" className="text-primary hover:underline">
                        {estado}
                      </Link>
                    </TD>
                    <TD className="text-right font-medium tabular-nums">{n}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin cotizaciones.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiSimple({ titulo, valor, nota }: { titulo: string; valor: number; nota: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="text-3xl">
          <CountUp value={valor} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{nota}</p>
      </CardContent>
    </Card>
  );
}
