import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { cargarCotizacionExport } from "@/lib/services/cotizacion-export";

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

  const wb = new ExcelJS.Workbook();
  wb.creator = "JSM Flow";
  const ws = wb.addWorksheet("Cotización");

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = `Cotización ${cot.folio}`;
  ws.getCell("A1").font = { bold: true, size: 16 };

  ws.addRow([]);
  ws.addRow(["Cliente", cot.cliente.nombre]);
  ws.addRow(["RFC", cot.cliente.rfc ?? "—"]);
  ws.addRow(["Fecha", cot.fecha]);
  ws.addRow(["Título", cot.titulo]);
  ws.addRow([]);

  const header = ws.addRow([
    "Descripción",
    "Cantidad",
    "Unidad",
    "Precio unitario",
    "Importe",
  ]);
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" },
    };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  cot.items.forEach((it) => {
    ws.addRow([
      it.descripcion,
      it.cantidad,
      it.unidad,
      it.precio_unitario,
      it.importe,
    ]);
  });

  ws.addRow([]);
  ws.addRow(["", "", "", "Subtotal", cot.subtotal]);
  if (cot.descuento > 0) ws.addRow(["", "", "", "Descuento", -cot.descuento]);
  ws.addRow(["", "", "", `IVA (${Math.round(cot.iva_tasa * 100)}%)`, cot.iva]);
  const totalRow = ws.addRow(["", "", "", "Total", cot.total]);
  totalRow.font = { bold: true };

  // Formato de moneda en columnas de dinero
  ["D", "E"].forEach((col) => {
    ws.getColumn(col).numFmt = '"$"#,##0.00';
  });
  ws.getColumn("A").width = 48;
  ws.getColumn("B").width = 12;
  ws.getColumn("C").width = 12;
  ws.getColumn("D").width = 18;
  ws.getColumn("E").width = 16;

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${cot.folio}.xlsx"`,
    },
  });
}
