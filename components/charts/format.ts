import { formatMoneda } from "@/lib/services/calculos";

/** Tokens de formato serializables (no se pueden pasar funciones a Client Components). */
export type FmtKind = "int" | "money" | "moneyShort";

export function fmt(n: number, kind: FmtKind = "int"): string {
  if (kind === "money") return formatMoneda(n);
  if (kind === "moneyShort") {
    return n >= 1000
      ? `$${(n / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k`
      : `$${Math.round(n).toLocaleString("es-MX")}`;
  }
  return n.toLocaleString("es-MX");
}
