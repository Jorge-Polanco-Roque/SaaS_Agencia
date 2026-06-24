import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export interface CatalogoItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  costo: number;
  precio_publico: number;
}

const SugerenciaSchema = z.object({
  items: z
    .array(
      z.object({
        producto_id: z
          .string()
          .nullable()
          .describe("id del catálogo si corresponde, si no null"),
        descripcion: z.string(),
        cantidad: z.number().positive(),
        unidad: z.string(),
        costo_unitario: z.number().min(0),
        precio_unitario: z.number().min(0),
      })
    )
    .describe("Partidas sugeridas para la cotización"),
  notas: z.string().optional().describe("Condiciones, vigencia o supuestos"),
});

export type SugerenciaCotizacion = z.infer<typeof SugerenciaSchema>;

const State = Annotation.Root({
  brief: Annotation<string>,
  catalogo: Annotation<CatalogoItem[]>,
  sugerencias: Annotation<SugerenciaCotizacion | null>,
});

const SYSTEM = `Eres el asistente de cotizaciones de JSM, una agencia de promocionales y eventos en México.
A partir del brief del ejecutivo y del catálogo disponible, propones las partidas de una cotización.
Reglas:
- Si una partida coincide con un producto del catálogo, usa su producto_id, costo y precio_publico.
- Si es algo no catalogado, deja producto_id en null y estima precios razonables en MXN.
- Sé concreto en cantidades y descripciones. No inventes productos del catálogo que no existan.`;

function buildModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta OPENAI_API_KEY: el asistente de cotización no está configurado."
    );
  }
  return new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
  }).withStructuredOutput(SugerenciaSchema, { name: "sugerir_cotizacion" });
}

async function proponer(state: typeof State.State) {
  const model = buildModel();
  const catalogoTxt = state.catalogo
    .map(
      (c) =>
        `- id=${c.id} | ${c.nombre} | unidad=${c.unidad} | costo=${c.costo} | precio=${c.precio_publico}`
    )
    .join("\n");

  const sugerencias = await model.invoke([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `BRIEF:\n${state.brief}\n\nCATÁLOGO:\n${catalogoTxt || "(vacío)"}`,
    },
  ]);

  return { sugerencias };
}

const compiled = new StateGraph(State)
  .addNode("proponer", proponer)
  .addEdge(START, "proponer")
  .addEdge("proponer", END)
  .compile();

/** Ejecuta el agente Cotizador y devuelve las partidas sugeridas. */
export async function runCotizador(
  brief: string,
  catalogo: CatalogoItem[]
): Promise<SugerenciaCotizacion> {
  const out = await compiled.invoke({ brief, catalogo, sugerencias: null });
  if (!out.sugerencias) throw new Error("El asistente no devolvió sugerencias.");
  return out.sugerencias;
}
