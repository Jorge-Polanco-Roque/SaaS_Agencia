import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { crearCliente } from "./actions";

export default async function CrmPage() {
  await requireCapability("crm.gestionar");
  const db = await createClient();
  const { data: clientes } = await db
    .from("clientes")
    .select("id, nombre, email, telefono, rfc")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        titulo="CRM · Clientes"
        descripcion="Directorio de clientes de la agencia."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Clientes ({clientes?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {clientes && clientes.length > 0 ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Nombre</TH>
                    <TH>RFC</TH>
                    <TH>Contacto</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {clientes.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.nombre}</TD>
                      <TD className="text-muted-foreground">{c.rfc ?? "—"}</TD>
                      <TD className="text-muted-foreground">
                        {c.email ?? c.telefono ?? "—"}
                      </TD>
                      <TD className="text-right">
                        <Link
                          href={`/crm/${c.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Ver
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay clientes. Crea el primero →
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nuevo cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={crearCliente} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre / Razón social *</Label>
                <Input id="nombre" name="nombre" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rfc">RFC</Label>
                <Input id="rfc" name="rfc" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" name="telefono" />
              </div>
              <SubmitButton className="w-full">Crear cliente</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
