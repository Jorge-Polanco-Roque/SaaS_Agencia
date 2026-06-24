import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

const ESTADO_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "danger"
> = {
  activo: "default",
  en_pausa: "warning",
  cerrado: "success",
  cancelado: "danger",
};

export default async function ProyectosPage() {
  await requireCapability("proyecto.gestionar");
  const db = await createClient();
  const { data: proyectos } = await db
    .from("proyectos")
    .select("id, nombre, estado, fecha_entrega, clientes(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        titulo="Proyectos"
        descripcion="Master de proyectos creados al confirmar cotizaciones."
      />
      <Card>
        <CardContent className="pt-6">
          {proyectos && proyectos.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Proyecto</TH>
                  <TH>Cliente</TH>
                  <TH>Estado</TH>
                  <TH>Entrega</TH>
                </TR>
              </THead>
              <TBody>
                {proyectos.map((p) => {
                  const cliente = Array.isArray(p.clientes)
                    ? p.clientes[0]
                    : p.clientes;
                  return (
                    <TR key={p.id}>
                      <TD>
                        <Link
                          href={`/proyectos/${p.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {p.nombre}
                        </Link>
                      </TD>
                      <TD className="text-muted-foreground">
                        {cliente?.nombre ?? "—"}
                      </TD>
                      <TD>
                        <Badge variant={ESTADO_VARIANT[p.estado] ?? "secondary"}>
                          {p.estado}
                        </Badge>
                      </TD>
                      <TD className="text-muted-foreground">
                        {p.fecha_entrega ?? "—"}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay proyectos. Se crean cuando un cliente confirma una
              cotización desde su portal.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
