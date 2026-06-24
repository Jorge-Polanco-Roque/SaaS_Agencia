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
import { KanbanBoard, type TareaCard } from "@/components/kanban/board";
import { ProgressRing } from "@/components/charts/progress-ring";
import { crearTareaAction, actualizarProyectoAction } from "../actions";

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("proyecto.gestionar");
  const { id } = await params;
  const db = await createClient();

  const { data: proyecto } = await db
    .from("proyectos")
    .select("*, clientes(nombre)")
    .eq("id", id)
    .single();
  if (!proyecto) notFound();

  const cliente = Array.isArray(proyecto.clientes)
    ? proyecto.clientes[0]
    : proyecto.clientes;

  const [{ data: tareas }, { data: miembros }] = await Promise.all([
    db.from("tareas").select("*").eq("proyecto_id", id),
    db.from("profiles").select("id, nombre"),
  ]);

  const nombrePorId = new Map((miembros ?? []).map((m) => [m.id, m.nombre]));

  let cotizacionFolio: string | null = null;
  if (proyecto.cotizacion_id) {
    const { data: cot } = await db
      .from("cotizaciones")
      .select("folio")
      .eq("id", proyecto.cotizacion_id)
      .single();
    cotizacionFolio = cot?.folio ?? null;
  }

  const cards: TareaCard[] = (tareas ?? []).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    columna: t.columna,
    orden: t.orden,
    responsable_nombre: t.responsable_id
      ? nombrePorId.get(t.responsable_id) ?? null
      : null,
    fecha_limite: t.fecha_limite,
  }));

  const idsTimeline = [id, proyecto.cotizacion_id].filter(Boolean) as string[];
  const { data: eventos } = await db
    .from("bitacora")
    .select("*")
    .in("entidad_id", idsTimeline)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader
        titulo={proyecto.nombre}
        descripcion={cliente?.nombre ?? undefined}
      >
        <Link href="/proyectos" className="text-sm text-primary hover:underline">
          ← Volver
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge>{proyecto.estado}</Badge>
        {proyecto.fecha_entrega && (
          <span className="text-sm text-muted-foreground">
            Entrega: {proyecto.fecha_entrega}
          </span>
        )}
        {proyecto.cotizacion_id && (
          <Link
            href={`/cotizaciones/${proyecto.cotizacion_id}`}
            className="ml-auto text-sm text-primary hover:underline"
          >
            Ver cotización origen →
          </Link>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Tablero</CardTitle>
          <div className="flex items-center gap-2">
            <ProgressRing
              size={64}
              thickness={8}
              value={cards.filter((c) => c.columna === "hecho").length}
              max={Math.max(1, cards.length)}
            />
            <span className="text-sm text-muted-foreground">
              {cards.filter((c) => c.columna === "hecho").length}/{cards.length} tareas
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <KanbanBoard proyectoId={id} tareas={cards} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Nueva tarea</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={crearTareaAction} className="space-y-3">
              <input type="hidden" name="proyecto_id" value={id} />
              <input type="hidden" name="columna" value="por_hacer" />
              <div className="space-y-1.5">
                <Label htmlFor="t_titulo">Título *</Label>
                <Input id="t_titulo" name="titulo" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t_resp">Responsable</Label>
                <Select id="t_resp" name="responsable_id" defaultValue="">
                  <option value="">— Sin asignar —</option>
                  {miembros?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t_fecha">Fecha límite</Label>
                <Input id="t_fecha" name="fecha_limite" type="date" />
              </div>
              <SubmitButton className="w-full">Agregar tarea</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={actualizarProyectoAction}
              resetOnSuccess={false}
              className="space-y-3"
            >
              <input type="hidden" name="proyecto_id" value={id} />
              <div className="space-y-1.5">
                <Label htmlFor="p_estado">Estado</Label>
                <Select
                  id="p_estado"
                  name="estado"
                  defaultValue={proyecto.estado}
                >
                  <option value="activo">Activo</option>
                  <option value="en_pausa">En pausa</option>
                  <option value="cerrado">Cerrado</option>
                  <option value="cancelado">Cancelado</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p_resp">Responsable</Label>
                <Select
                  id="p_resp"
                  name="responsable_id"
                  defaultValue={proyecto.responsable_id ?? ""}
                >
                  <option value="">— Sin asignar —</option>
                  {miembros?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p_entrega">Fecha de entrega</Label>
                <Input
                  id="p_entrega"
                  name="fecha_entrega"
                  type="date"
                  defaultValue={proyecto.fecha_entrega ?? ""}
                />
              </div>

              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Master de Proyectos (JSM)
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="p_covac">Cóvac (co-validador)</Label>
                    <Select
                      id="p_covac"
                      name="covac_id"
                      defaultValue={proyecto.covac_id ?? ""}
                    >
                      <option value="">— Sin asignar —</option>
                      {miembros?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_hijo">Hijo / RIB</Label>
                    <Input
                      id="p_hijo"
                      name="hijo_rib"
                      defaultValue={proyecto.hijo_rib ?? ""}
                      placeholder="Sub-proyecto / referencia"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_val">Validación #</Label>
                    <Input
                      id="p_val"
                      name="validacion_num"
                      defaultValue={proyecto.validacion_num ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p_pdf">PDF Final #</Label>
                    <Input
                      id="p_pdf"
                      name="pdf_num"
                      defaultValue={proyecto.pdf_num ?? ""}
                      placeholder={cotizacionFolio ?? "Folio del PDF"}
                    />
                  </div>
                </div>
              </div>

              <SubmitButton className="w-full">Guardar</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trazabilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventos && eventos.length > 0 ? (
              eventos.map((e) => (
                <div key={e.id} className="text-sm">
                  <p className="font-medium">
                    {e.entidad} · {e.accion}
                    {e.estado_nuevo ? ` → ${e.estado_nuevo}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("es-MX")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin eventos.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
