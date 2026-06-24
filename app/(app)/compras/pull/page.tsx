import Link from "next/link";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { PullClient } from "./pull-client";

export default async function PullPage() {
  await requireCapability("compras.gestionar");
  return (
    <div>
      <PageHeader
        titulo="Pull de proveedores"
        descripcion="Ranking por tiempo/costo, refinado con IA si está configurada."
      >
        <Link href="/compras" className="text-sm text-primary hover:underline">
          ← Volver
        </Link>
      </PageHeader>
      <PullClient />
    </div>
  );
}
