import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { CotizacionForm } from "./cotizacion-form";

export default async function NuevaCotizacionPage() {
  await requireCapability("cotizacion.crear");
  const db = await createClient();

  const [{ data: clientes }, { data: productos }] = await Promise.all([
    db.from("clientes").select("id, nombre").order("nombre"),
    db
      .from("productos_servicios")
      .select("id, nombre, descripcion, unidad, costo, precio_publico")
      .eq("activo", true)
      .order("nombre"),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Nueva cotización"
        descripcion="Arma las partidas a costo; el folio se asigna al validar."
      >
        <Link href="/cotizaciones" className="text-sm text-primary hover:underline">
          ← Volver
        </Link>
      </PageHeader>

      <CotizacionForm clientes={clientes ?? []} productos={productos ?? []} />
    </div>
  );
}
