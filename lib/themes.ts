export interface Tema {
  id: string;
  nombre: string;
  /** Color representativo para el swatch del selector. */
  dot: string;
  oscuro: boolean;
}

export const TEMAS: Tema[] = [
  { id: "indigo", nombre: "Índigo", dot: "#2A4BD7", oscuro: false },
  { id: "esmeralda", nombre: "Esmeralda", dot: "#0E9F6E", oscuro: false },
  { id: "carmesi", nombre: "Carmesí", dot: "#BE1E45", oscuro: false },
  { id: "solar", nombre: "Solar", dot: "#F97316", oscuro: false },
  { id: "medianoche", nombre: "Medianoche", dot: "#22D3EE", oscuro: true },
  { id: "grafito", nombre: "Grafito", dot: "#F59E0B", oscuro: true },
  { id: "orquidea", nombre: "Orquídea", dot: "#C026D3", oscuro: true },
];

export const TEMA_DEFAULT = "indigo";
export const TEMA_STORAGE_KEY = "jsm-theme";
