import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { OcForm } from "./oc-form";

export default async function NuevaOcPage() {
  await requireCapability("compras.gestionar");
  const db = await createClient();
  const [{ data: proveedores }, { data: proyectos }, { data: productos }] =
    await Promise.all([
      db.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
      db.from("proyectos").select("id, nombre").order("created_at", { ascending: false }),
      db
        .from("productos_servicios")
        .select("id, nombre, unidad, costo")
        .eq("activo", true)
        .order("nombre"),
    ]);

  return (
    <div>
      <PageHeader titulo="Nueva orden de compra" descripcion="A costo, ligada a proyecto y proveedor.">
        <Link href="/compras" className="text-sm text-primary hover:underline">
          ← Volver
        </Link>
      </PageHeader>
      <OcForm
        proveedores={proveedores ?? []}
        proyectos={proyectos ?? []}
        productos={productos ?? []}
      />
    </div>
  );
}
