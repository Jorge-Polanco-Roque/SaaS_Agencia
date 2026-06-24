import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export interface FacturaVencida {
  factura_id: string;
  cliente: string;
  folio: string;
  monto: number;
  moneda: string;
  dias_vencido: number;
}

const SalidaSchema = z.object({
  mensajes: z.array(
    z.object({
      factura_id: z.string(),
      asunto: z.string(),
      mensaje: z
        .string()
        .describe("Recordatorio cordial pero firme, en español de México"),
    })
  ),
});
export type SalidaCobranza = z.infer<typeof SalidaSchema>;

const State = Annotation.Root({
  facturas: Annotation<FacturaVencida[]>,
  salida: Annotation<SalidaCobranza | null>,
});

const SYSTEM = `Eres el agente de cobranza de JSM (agencia de promocionales y eventos).
Redactas recordatorios de pago cordiales, profesionales y breves (2-4 frases) en
español de México. Ajusta el tono al atraso: amable si son pocos días, más firme si
es mucho. Incluye folio y monto. No amenaces; ofrece facilidades de contacto.`;

function buildModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY: cobranza con IA no configurada.");
  return new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.4,
  }).withStructuredOutput(SalidaSchema, { name: "redactar_recordatorios" });
}

async function redactar(state: typeof State.State) {
  const model = buildModel();
  const lista = state.facturas
    .map(
      (f) =>
        `- factura_id=${f.factura_id} | ${f.cliente} | folio ${f.folio} | ${f.monto} ${f.moneda} | ${f.dias_vencido} días vencida`
    )
    .join("\n");
  const salida = await model.invoke([
    { role: "system", content: SYSTEM },
    { role: "user", content: `FACTURAS VENCIDAS:\n${lista}` },
  ]);
  return { salida };
}

const compiled = new StateGraph(State)
  .addNode("redactar", redactar)
  .addEdge(START, "redactar")
  .addEdge("redactar", END)
  .compile();

export async function runCobranza(
  facturas: FacturaVencida[]
): Promise<SalidaCobranza> {
  const out = await compiled.invoke({ facturas, salida: null });
  if (!out.salida) throw new Error("El agente no devolvió mensajes.");
  return out.salida;
}
