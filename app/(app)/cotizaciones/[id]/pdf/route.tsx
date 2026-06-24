import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { cargarCotizacionExport } from "@/lib/services/cotizacion-export";
import { CotizacionPDF } from "@/lib/pdf/cotizacion-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSession();
  if (!can(user.rol, "cotizacion.ver_costos")) {
    return new NextResponse("No autorizado", { status: 403 });
  }
  const { id } = await params;
  const db = await createClient();
  const cot = await cargarCotizacionExport(db, id);
  if (!cot) return new NextResponse("No encontrada", { status: 404 });

  const buffer = await renderToBuffer(<CotizacionPDF cot={cot} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${cot.folio}.pdf"`,
    },
  });
}
