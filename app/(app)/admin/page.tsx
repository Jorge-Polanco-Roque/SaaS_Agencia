import { requireCapability } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function AdminPage() {
  const user = await requireCapability("admin.config");
  const db = await createClient();

  const [{ data: org }, { data: usuarios }, { data: consecutivos }] =
    await Promise.all([
      db.from("organizations").select("nombre, created_at").eq("id", user.orgId).single(),
      db.from("profiles").select("id, nombre, rol, created_at").order("created_at"),
      db.from("consecutivos").select("serie, anio, ultimo").order("anio", { ascending: false }),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Administración"
        descripcion="Organización, usuarios y series de folios."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Organización</CardDescription>
            <CardTitle className="text-xl">{org?.nombre ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Usuarios</CardDescription>
            <CardTitle className="text-3xl">{usuarios?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Series de folios</CardDescription>
            <CardTitle className="text-3xl">{consecutivos?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios y roles</CardTitle>
          <CardDescription>
            Miembros de {org?.nombre ?? "la organización"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nombre</TH>
                <TH>Rol</TH>
                <TH>Alta</TH>
              </TR>
            </THead>
            <TBody>
              {usuarios?.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium">
                    {u.nombre}
                    {u.id === user.id && (
                      <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                    )}
                  </TD>
                  <TD>
                    <Badge variant="secondary">{ROLE_LABELS[u.rol]}</Badge>
                  </TD>
                  <TD className="text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("es-MX")}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Series de consecutivos</CardTitle>
          <CardDescription>Último folio asignado por serie y año.</CardDescription>
        </CardHeader>
        <CardContent>
          {consecutivos && consecutivos.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Serie</TH>
                  <TH>Año</TH>
                  <TH className="text-right">Último folio</TH>
                </TR>
              </THead>
              <TBody>
                {consecutivos.map((c) => (
                  <TR key={`${c.serie}-${c.anio}`}>
                    <TD className="font-mono">{c.serie}</TD>
                    <TD>{c.anio}</TD>
                    <TD className="text-right font-medium tabular-nums">{c.ultimo}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no se han generado folios.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
