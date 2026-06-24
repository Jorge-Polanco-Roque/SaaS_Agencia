import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { ProveedorRankeado } from "@/lib/services/pull-proveedores";

const RecomendacionSchema = z.object({
  recomendaciones: z
    .array(
      z.object({
        proveedor_id: z.string(),
        nombre: z.string(),
        razon: z.string().describe("Por qué conviene para esta requisición"),
      })
    )
    .describe("Proveedores recomendados, del mejor al menos bueno"),
  resumen: z.string().optional(),
});

export type RecomendacionPull = z.infer<typeof RecomendacionSchema>;

const State = Annotation.Root({
  requisicion: Annotation<string>,
  prioridad: Annotation<string>,
  proveedores: Annotation<ProveedorRankeado[]>,
  resultado: Annotation<RecomendacionPull | null>,
});

const SYSTEM = `Eres el agente de compras de JSM (promocionales y eventos).
Recibes una requisición y una lista de proveedores YA pre-rankeados por un score
(tiempo de entrega y costo de referencia). Recomienda los más adecuados para la
requisición según la prioridad indicada (costo, tiempo o balance), explicando el
porqué en una frase. Respeta el orden del score salvo que la requisición justifique
otra cosa. No inventes proveedores fuera de la lista.`;

function buildModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta OPENAI_API_KEY: el Pull con IA no está configurado.");
  }
  return new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
  }).withStructuredOutput(RecomendacionSchema, { name: "recomendar_proveedores" });
}

async function recomendar(state: typeof State.State) {
  const model = buildModel();
  const lista = state.proveedores
    .map(
      (p) =>
        `- id=${p.id} | ${p.nombre} | score=${p.score} | ${p.motivo} | cat=${p.categoria ?? "—"}`
    )
    .join("\n");

  const resultado = await model.invoke([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `REQUISICIÓN:\n${state.requisicion}\n\nPRIORIDAD: ${state.prioridad}\n\nPROVEEDORES:\n${lista || "(vacío)"}`,
    },
  ]);
  return { resultado };
}

const compiled = new StateGraph(State)
  .addNode("recomendar", recomendar)
  .addEdge(START, "recomendar")
  .addEdge("recomendar", END)
  .compile();

export async function runPull(
  requisicion: string,
  prioridad: string,
  proveedores: ProveedorRankeado[]
): Promise<RecomendacionPull> {
  const out = await compiled.invoke({
    requisicion,
    prioridad,
    proveedores,
    resultado: null,
  });
  if (!out.resultado) throw new Error("El agente no devolvió recomendaciones.");
  return out.resultado;
}
