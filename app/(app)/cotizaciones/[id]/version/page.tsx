import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { CotizacionForm } from "../../nueva/cotizacion-form";

export default async function NuevaVersionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("cotizacion.crear");
  const { id } = await params;
  const db = await createClient();

  const { data: cot } = await db
    .from("cotizaciones")
    .select("*")
    .eq("id", id)
    .single();
  if (!cot) notFound();

  const [{ data: clientes }, { data: productos }, { data: items }] =
    await Promise.all([
      db.from("clientes").select("id, nombre").order("nombre"),
      db
        .from("productos_servicios")
        .select("id, nombre, descripcion, unidad, costo, precio_publico")
        .eq("activo", true)
        .order("nombre"),
      db
        .from("cotizacion_items")
        .select("*")
        .eq("cotizacion_id", id)
        .order("orden"),
    ]);

  return (
    <div>
      <PageHeader
        titulo={`Nueva versión · ${cot.titulo}`}
        descripcion={`Versión actual v${cot.version}. Se guardará un snapshot.`}
      >
        <Link
          href={`/cotizaciones/${id}`}
          className="text-sm text-primary hover:underline"
        >
          ← Volver
        </Link>
      </PageHeader>

      <CotizacionForm
        modo="version"
        cotizacionId={id}
        clientes={clientes ?? []}
        productos={productos ?? []}
        inicial={{
          cliente_id: cot.cliente_id,
          titulo: cot.titulo,
          iva_tasa: cot.iva_tasa,
          descuento: cot.descuento,
          notas: cot.notas ?? "",
          items: (items ?? []).map((it) => ({
            producto_id: it.producto_id ?? "",
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            unidad: it.unidad,
            costo_unitario: it.costo_unitario,
            precio_unitario: it.precio_unitario,
            modalidad: (it.modalidad === "personal" ? "personal" : "producto") as
              | "producto"
              | "personal",
            rol: it.rol ?? "",
            dias: it.dias ?? 1,
          })),
        }}
      />
    </div>
  );
}
