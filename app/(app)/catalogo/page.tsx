import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMoneda } from "@/lib/services/calculos";
import { crearProducto, crearProveedor } from "./actions";

const TIPO_LABEL: Record<string, string> = {
  promocional: "Promocional",
  evento: "Evento",
  servicio: "Servicio",
};

export default async function CatalogoPage() {
  await requireCapability("catalogo.gestionar");
  const db = await createClient();

  const [{ data: productos }, { data: proveedores }] = await Promise.all([
    db
      .from("productos_servicios")
      .select("id, tipo, nombre, unidad, costo, precio_publico, activo")
      .order("created_at", { ascending: false }),
    db
      .from("proveedores")
      .select("id, nombre, categoria, dias_entrega, activo")
      .order("nombre"),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          titulo="Catálogo · Productos y servicios"
          descripcion="Precio público y costo interno (el costo no se muestra al cliente)."
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Productos ({productos?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {productos && productos.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Nombre</TH>
                      <TH>Tipo</TH>
                      <TH className="text-right">Costo</TH>
                      <TH className="text-right">Público</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {productos.map((p) => (
                      <TR key={p.id}>
                        <TD className="font-medium">{p.nombre}</TD>
                        <TD>
                          <Badge variant="secondary">
                            {TIPO_LABEL[p.tipo] ?? p.tipo}
                          </Badge>
                        </TD>
                        <TD className="text-right text-muted-foreground">
                          {formatMoneda(p.costo)}
                        </TD>
                        <TD className="text-right font-medium">
                          {formatMoneda(p.precio_publico)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sin productos en catálogo.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Nuevo producto</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={crearProducto} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p_nombre">Nombre *</Label>
                  <Input id="p_nombre" name="nombre" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="p_tipo">Tipo</Label>
                    <Select id="p_tipo" name="tipo" defaultValue="promocional">
                      <option value="promocional">Promocional</option>
                      <option value="evento">Evento</option>
                      <option value="servicio">Servicio</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_unidad">Unidad</Label>
                    <Input id="p_unidad" name="unidad" defaultValue="pieza" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="p_costo">Costo</Label>
                    <Input
                      id="p_costo"
                      name="costo"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_precio">Precio público</Label>
                    <Input
                      id="p_precio"
                      name="precio_publico"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue="0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p_prov">Proveedor</Label>
                  <Select id="p_prov" name="proveedor_id" defaultValue="">
                    <option value="">— Sin proveedor —</option>
                    {proveedores?.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p_desc">Descripción</Label>
                  <Textarea id="p_desc" name="descripcion" />
                </div>
                <SubmitButton className="w-full">Crear producto</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <PageHeader
          titulo="Proveedores"
          descripcion="Base de proveedores para el Pull (Fase 3)."
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Proveedores ({proveedores?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {proveedores && proveedores.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Nombre</TH>
                      <TH>Categoría</TH>
                      <TH className="text-right">Días entrega</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {proveedores.map((pr) => (
                      <TR key={pr.id}>
                        <TD className="font-medium">{pr.nombre}</TD>
                        <TD className="text-muted-foreground">
                          {pr.categoria ?? "—"}
                        </TD>
                        <TD className="text-right text-muted-foreground">
                          {pr.dias_entrega ?? "—"}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sin proveedores.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Nuevo proveedor</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={crearProveedor} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pr_nombre">Nombre *</Label>
                  <Input id="pr_nombre" name="nombre" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr_cat">Categoría</Label>
                  <Input
                    id="pr_cat"
                    name="categoria"
                    placeholder="Amazon, DF, Sorteo, KFC…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pr_contacto">Contacto</Label>
                    <Input id="pr_contacto" name="contacto" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pr_dias">Días entrega</Label>
                    <Input
                      id="pr_dias"
                      name="dias_entrega"
                      type="number"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr_email">Correo</Label>
                  <Input id="pr_email" name="email" type="email" />
                </div>
                <SubmitButton className="w-full">Crear proveedor</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
