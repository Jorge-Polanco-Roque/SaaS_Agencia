import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoneda } from "@/lib/services/calculos";

const ESTADO_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "danger"
> = {
  borrador: "secondary",
  por_autorizar: "warning",
  autorizada: "default",
  rechazada: "danger",
  cerrada: "success",
  cancelada: "danger",
};

export default async function ComprasPage() {
  await requireCapability("compras.gestionar");
  const db = await createClient();
  const { data: ocs } = await db
    .from("ordenes_compra")
    .select("id, folio, estado, total, proveedores(nombre), proyectos(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        titulo="Compras · Órdenes de compra"
        descripcion="PO ligadas a proyectos y proveedores."
      >
        <Link href="/compras/pull" className={buttonVariants({ variant: "outline" })}>
          Pull de proveedores
        </Link>
        <Link href="/compras/nueva" className={buttonVariants()}>
          Nueva OC
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          {ocs && ocs.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Folio</TH>
                  <TH>Proveedor</TH>
                  <TH>Proyecto</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {ocs.map((oc) => {
                  const prov = Array.isArray(oc.proveedores)
                    ? oc.proveedores[0]
                    : oc.proveedores;
                  const proy = Array.isArray(oc.proyectos)
                    ? oc.proyectos[0]
                    : oc.proyectos;
                  return (
                    <TR key={oc.id}>
                      <TD className="font-mono text-xs">
                        <Link
                          href={`/compras/${oc.id}`}
                          className="text-primary hover:underline"
                        >
                          {oc.folio ?? "borrador"}
                        </Link>
                      </TD>
                      <TD className="font-medium">{prov?.nombre ?? "—"}</TD>
                      <TD className="text-muted-foreground">{proy?.nombre ?? "—"}</TD>
                      <TD>
                        <Badge variant={ESTADO_VARIANT[oc.estado] ?? "secondary"}>
                          {oc.estado}
                        </Badge>
                      </TD>
                      <TD className="text-right font-medium">
                        {formatMoneda(oc.total)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sin órdenes de compra. Crea la primera →
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
