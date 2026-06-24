import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { crearContacto } from "../actions";

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("crm.gestionar");
  const { id } = await params;
  const db = await createClient();

  const { data: cliente } = await db
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();
  if (!cliente) notFound();

  const { data: contactos } = await db
    .from("contactos")
    .select("*")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });

  const { data: cotizaciones } = await db
    .from("cotizaciones")
    .select("id, folio, titulo, estado, total")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader titulo={cliente.nombre} descripcion={cliente.rfc ?? undefined}>
        <Link href="/crm" className="text-sm text-primary hover:underline">
          ← Volver
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Correo</p>
                <p>{cliente.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Teléfono</p>
                <p>{cliente.telefono ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Notas</p>
                <p>{cliente.notas ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contactos ({contactos?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {contactos && contactos.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Nombre</TH>
                      <TH>Cargo</TH>
                      <TH>Correo</TH>
                      <TH>Teléfono</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {contactos.map((c) => (
                      <TR key={c.id}>
                        <TD className="font-medium">{c.nombre}</TD>
                        <TD className="text-muted-foreground">{c.cargo ?? "—"}</TD>
                        <TD className="text-muted-foreground">{c.email ?? "—"}</TD>
                        <TD className="text-muted-foreground">
                          {c.telefono ?? "—"}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin contactos.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cotizaciones ({cotizaciones?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {cotizaciones && cotizaciones.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Folio</TH>
                      <TH>Título</TH>
                      <TH>Estado</TH>
                      <TH className="text-right">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {cotizaciones.map((q) => (
                      <TR key={q.id}>
                        <TD className="font-mono text-xs">{q.folio ?? "—"}</TD>
                        <TD>
                          <Link
                            href={`/cotizaciones/${q.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {q.titulo}
                          </Link>
                        </TD>
                        <TD className="text-muted-foreground">{q.estado}</TD>
                        <TD className="text-right">
                          {q.total.toLocaleString("es-MX", {
                            style: "currency",
                            currency: "MXN",
                          })}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin cotizaciones.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nuevo contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={crearContacto} className="space-y-3">
              <input type="hidden" name="cliente_id" value={id} />
              <div className="space-y-1.5">
                <Label htmlFor="c_nombre">Nombre *</Label>
                <Input id="c_nombre" name="nombre" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_cargo">Cargo</Label>
                <Input id="c_cargo" name="cargo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_email">Correo</Label>
                <Input id="c_email" name="email" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_telefono">Teléfono</Label>
                <Input id="c_telefono" name="telefono" />
              </div>
              <SubmitButton className="w-full">Agregar contacto</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
