import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CotizacionExport } from "@/lib/services/cotizacion-export";
import { formatMoneda } from "@/lib/services/calculos";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#0d1117", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1e40af" },
  muted: { color: "#6b7280" },
  folio: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  box: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  row: { flexDirection: "row" },
  th: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    color: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
  },
  td: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  cDesc: { width: "46%" },
  cQty: { width: "14%", textAlign: "right" },
  cPrice: { width: "20%", textAlign: "right" },
  cImporte: { width: "20%", textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", width: 200, justifyContent: "space-between" },
  totalStrong: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  notas: { marginTop: 18, color: "#374151" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

export function CotizacionPDF({ cot }: { cot: CotizacionExport }) {
  const m = (n: number) => formatMoneda(n, cot.moneda);
  return (
    <Document title={`Cotización ${cot.folio}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>JSM</Text>
            <Text style={s.muted}>Promocionales y eventos</Text>
          </View>
          <View>
            <Text style={s.folio}>Cotización {cot.folio}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>{cot.fecha}</Text>
          </View>
        </View>

        <View style={s.box}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{cot.cliente.nombre}</Text>
          {cot.cliente.rfc ? <Text style={s.muted}>RFC: {cot.cliente.rfc}</Text> : null}
          {cot.cliente.email ? <Text style={s.muted}>{cot.cliente.email}</Text> : null}
          <Text style={{ marginTop: 4 }}>{cot.titulo}</Text>
        </View>

        <View style={s.th}>
          <Text style={s.cDesc}>Descripción</Text>
          <Text style={s.cQty}>Cantidad</Text>
          <Text style={s.cPrice}>P. unitario</Text>
          <Text style={s.cImporte}>Importe</Text>
        </View>
        {cot.items.map((it, i) => (
          <View style={s.td} key={i}>
            <Text style={s.cDesc}>{it.descripcion}</Text>
            <Text style={s.cQty}>
              {it.cantidad} {it.unidad}
            </Text>
            <Text style={s.cPrice}>{m(it.precio_unitario)}</Text>
            <Text style={s.cImporte}>{m(it.importe)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalLine}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{m(cot.subtotal)}</Text>
          </View>
          {cot.descuento > 0 ? (
            <View style={s.totalLine}>
              <Text style={s.muted}>Descuento</Text>
              <Text>- {m(cot.descuento)}</Text>
            </View>
          ) : null}
          <View style={s.totalLine}>
            <Text style={s.muted}>IVA ({Math.round(cot.iva_tasa * 100)}%)</Text>
            <Text>{m(cot.iva)}</Text>
          </View>
          <View style={[s.totalLine, { marginTop: 4 }]}>
            <Text style={s.totalStrong}>Total</Text>
            <Text style={s.totalStrong}>{m(cot.total)}</Text>
          </View>
        </View>

        {cot.notas ? (
          <View style={s.notas}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
              Notas
            </Text>
            <Text>{cot.notas}</Text>
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          JSM Flow · Documento generado automáticamente · {cot.folio}
        </Text>
      </Page>
    </Document>
  );
}
