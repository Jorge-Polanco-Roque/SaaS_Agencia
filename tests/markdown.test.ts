import { describe, expect, it } from "vitest";
import {
  parsearBloques,
  tokenizarInline,
} from "@/components/copiloto/markdown-parse";

describe("parsearBloques", () => {
  it("separa un párrafo introductorio de una lista (caso cobranza)", () => {
    const src = `Las cuentas por cobrar son las siguientes:
- **Por cobrar:** $329,440.00
- **Vencido:** $157,760.00
- **Cobrado:** $191,400.00`;
    const b = parsearBloques(src);
    expect(b).toHaveLength(2);
    expect(b[0].tipo).toBe("p");
    expect(b[1]).toMatchObject({ tipo: "ul" });
    if (b[1].tipo === "ul") expect(b[1].items).toHaveLength(3);
  });

  it("agrupa items consecutivos en una sola lista", () => {
    const b = parsearBloques("- uno\n- dos\n- tres");
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ tipo: "ul", items: ["uno", "dos", "tres"] });
  });

  it("reconoce listas ordenadas", () => {
    const b = parsearBloques("1. primero\n2. segundo");
    expect(b[0]).toMatchObject({ tipo: "ol", items: ["primero", "segundo"] });
  });

  it("reconoce encabezados con nivel", () => {
    const b = parsearBloques("## Resumen");
    expect(b[0]).toEqual({ tipo: "h", nivel: 2, texto: "Resumen" });
  });

  it("una línea en blanco separa párrafos", () => {
    const b = parsearBloques("Hola\n\nAdiós");
    expect(b).toHaveLength(2);
    expect(b.every((x) => x.tipo === "p")).toBe(true);
  });

  it("texto vacío → sin bloques", () => {
    expect(parsearBloques("")).toEqual([]);
  });
});

describe("tokenizarInline", () => {
  it("extrae negritas en **...**", () => {
    const t = tokenizarInline("**Por cobrar:** $329,440.00");
    expect(t[0]).toEqual({ t: "strong", v: "Por cobrar:" });
    expect(t[1]).toEqual({ t: "text", v: " $329,440.00" });
  });

  it("maneja cursiva y código en la misma línea", () => {
    const t = tokenizarInline("usa `npm run dev` y *espera*");
    expect(t.some((x) => x.t === "code" && x.v === "npm run dev")).toBe(true);
    expect(t.some((x) => x.t === "em" && x.v === "espera")).toBe(true);
  });

  it("texto sin formato es un solo token de texto", () => {
    expect(tokenizarInline("hola mundo")).toEqual([{ t: "text", v: "hola mundo" }]);
  });
});
