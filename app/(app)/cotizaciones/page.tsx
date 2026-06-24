import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoneda } from "@/lib/services/calculos";
import { ESTADO_LABELS } from "@/lib/services/state-machine";
import type { CotizacionEstado } from "@/lib/supabase/database.types";

const ESTADO_VARIANT: Record<
  CotizacionEstado,
  "default" | "secondary" | "success" | "warning" | "danger"
> = {
  borrador: "secondary",
  en_validacion: "warning",
  validada: "default",
  rechazada: "danger",
  enviada_cliente: "default",
  conforme_pendiente: "warning",
  confirmada: "success",
  en_negociacion: "warning",
  cancelada: "danger",
};

export default async function CotizacionesPage() {
  await requireCapability("cotizacion.crear");
  const db = await createClient();
  const { data: cotizaciones } = await db
    .from("cotizaciones")
    .select("id, folio, titulo, estado, total, version, clientes(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        titulo="Cotizaciones"
        descripcion="Consecutivo, validación y envío al cliente."
      >
        <Link href="/cotizaciones/nueva" className={buttonVariants()}>
          Nueva cotización
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          {cotizaciones && cotizaciones.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Folio</TH>
                  <TH>Título</TH>
                  <TH>Cliente</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {cotizaciones.map((q) => {
                  const cliente = Array.isArray(q.clientes)
                    ? q.clientes[0]
                    : q.clientes;
                  return (
                    <TR key={q.id}>
                      <TD className="font-mono text-xs">
                        {q.folio ?? <span className="text-muted-foreground">—</span>}
                      </TD>
                      <TD>
                        <Link
                          href={`/cotizaciones/${q.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {q.titulo}
                        </Link>
                        {q.version > 1 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            v{q.version}
                          </span>
                        )}
                      </TD>
                      <TD className="text-muted-foreground">
                        {cliente?.nombre ?? "—"}
                      </TD>
                      <TD>
                        <Badge variant={ESTADO_VARIANT[q.estado]}>
                          {ESTADO_LABELS[q.estado]}
                        </Badge>
                      </TD>
                      <TD className="text-right font-medium">
                        {formatMoneda(q.total)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay cotizaciones. Crea la primera →
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
