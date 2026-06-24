"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { calcularTotales, formatMoneda, importeItem } from "@/lib/services/calculos";
import {
  asistirCotizacionAction,
  nuevaCotizacionAction,
  nuevaVersionAction,
} from "../actions";

export interface ClienteOpt {
  id: string;
  nombre: string;
}
export interface ProductoOpt {
  id: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  costo: number;
  precio_publico: number;
}

interface ItemRow {
  producto_id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  precio_unitario: number;
  modalidad: "producto" | "personal";
  rol: string;
  dias: number;
}

const filaVacia = (): ItemRow => ({
  producto_id: "",
  descripcion: "",
  cantidad: 1,
  unidad: "pieza",
  costo_unitario: 0,
  precio_unitario: 0,
  modalidad: "producto",
  rol: "",
  dias: 1,
});

export function CotizacionForm({
  clientes,
  productos,
  modo = "nueva",
  cotizacionId,
  inicial,
}: {
  clientes: ClienteOpt[];
  productos: ProductoOpt[];
  modo?: "nueva" | "version";
  cotizacionId?: string;
  inicial?: Partial<{
    cliente_id: string;
    titulo: string;
    iva_tasa: number;
    descuento: number;
    notas: string;
    items: ItemRow[];
  }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState(inicial?.cliente_id ?? "");
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [ivaTasa, setIvaTasa] = useState(inicial?.iva_tasa ?? 0.16);
  const [descuento, setDescuento] = useState(inicial?.descuento ?? 0);
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [motivo, setMotivo] = useState("");
  const [items, setItems] = useState<ItemRow[]>(
    inicial?.items?.length ? inicial.items : [filaVacia()]
  );

  // Asistente IA
  const [brief, setBrief] = useState("");
  const [asistiendo, startAsistente] = useTransition();
  const [asistenteMsg, setAsistenteMsg] = useState<string | null>(null);

  function asistir() {
    setAsistenteMsg(null);
    startAsistente(async () => {
      const res = await asistirCotizacionAction(brief);
      if (!res.ok) {
        setAsistenteMsg(res.error);
        return;
      }
      if (res.items.length) {
        setItems(res.items);
        if (res.notas && !notas) setNotas(res.notas);
        setAsistenteMsg(`Se propusieron ${res.items.length} partidas.`);
      } else {
        setAsistenteMsg("El asistente no propuso partidas.");
      }
    });
  }

  const totales = useMemo(
    () => calcularTotales(items, { descuento, ivaTasa }),
    [items, descuento, ivaTasa]
  );

  function actualizarItem(i: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
    );
  }

  function elegirProducto(i: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId);
    if (!p) {
      actualizarItem(i, { producto_id: "" });
      return;
    }
    actualizarItem(i, {
      producto_id: p.id,
      descripcion: p.nombre + (p.descripcion ? ` — ${p.descripcion}` : ""),
      unidad: p.unidad,
      costo_unitario: p.costo,
      precio_unitario: p.precio_publico,
    });
  }

  function enviar() {
    setError(null);
    const payload = {
      cliente_id: clienteId,
      titulo,
      moneda: "MXN",
      iva_tasa: ivaTasa,
      descuento,
      notas: notas || undefined,
      items: items.map((it) => ({
        producto_id: it.producto_id || undefined,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        unidad: it.unidad,
        costo_unitario: it.costo_unitario,
        precio_unitario: it.precio_unitario,
        modalidad: it.modalidad,
        rol: it.modalidad === "personal" ? it.rol || undefined : undefined,
        dias: it.modalidad === "personal" ? it.dias : 1,
      })),
    };

    startTransition(async () => {
      const res =
        modo === "version" && cotizacionId
          ? await nuevaVersionAction(cotizacionId, { ...payload, motivo })
          : await nuevaCotizacionAction(payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/cotizaciones/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-accent/40 bg-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-accent">Asistente de cotización (IA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Ej: 200 termos personalizados y 100 libretas para evento médico en CDMX, entrega en 2 semanas."
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={asistir}
              disabled={asistiendo}
            >
              {asistiendo ? "Generando…" : "Proponer partidas"}
            </Button>
            {asistenteMsg && (
              <span className="text-sm text-muted-foreground">{asistenteMsg}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cliente">Cliente *</Label>
            <Select
              id="cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">— Selecciona —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Promocionales evento médico"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iva">IVA (%)</Label>
            <Input
              id="iva"
              type="number"
              step="1"
              min="0"
              max="100"
              value={Math.round(ivaTasa * 100)}
              onChange={(e) =>
                setIvaTasa((Number(e.target.value) || 0) / 100)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descuento">Descuento ($)</Label>
            <Input
              id="descuento"
              type="number"
              step="0.01"
              min="0"
              value={descuento}
              onChange={(e) => setDescuento(Number(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Partidas</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((p) => [...p, filaVacia()])}
          >
            + Agregar partida
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((it, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border bg-secondary/30 p-3"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Modalidad</Label>
                  <Select
                    value={it.modalidad}
                    onChange={(e) =>
                      actualizarItem(i, {
                        modalidad: e.target.value as ItemRow["modalidad"],
                        ...(e.target.value === "producto"
                          ? { dias: 1, rol: "" }
                          : {}),
                      })
                    }
                  >
                    <option value="producto">Producto / servicio</option>
                    <option value="personal">Personal (rol × personas × días)</option>
                  </Select>
                </div>
                {it.modalidad === "personal" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Rol</Label>
                      <Input
                        value={it.rol}
                        placeholder="Promotor / Supervisor / Coordinador"
                        onChange={(e) => actualizarItem(i, { rol: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 w-24">
                      <Label className="text-xs">Días</Label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={it.dias}
                        onChange={(e) =>
                          actualizarItem(i, {
                            dias: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-12">
              <div className="space-y-1 md:col-span-3">
                <Label className="text-xs">Producto (catálogo)</Label>
                <Select
                  value={it.producto_id}
                  onChange={(e) => elegirProducto(i, e.target.value)}
                >
                  <option value="">— Manual —</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label htmlFor={`it-desc-${i}`} className="text-xs">
                  Descripción
                </Label>
                <Input
                  id={`it-desc-${i}`}
                  value={it.descripcion}
                  onChange={(e) =>
                    actualizarItem(i, { descripcion: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label className="text-xs">
                  {it.modalidad === "personal" ? "Personas" : "Cant."}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={it.cantidad}
                  onChange={(e) =>
                    actualizarItem(i, { cantidad: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Costo unit.</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={it.costo_unitario}
                  onChange={(e) =>
                    actualizarItem(i, {
                      costo_unitario: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Precio unit.</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={it.precio_unitario}
                  onChange={(e) =>
                    actualizarItem(i, {
                      precio_unitario: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-end justify-between md:col-span-1">
                <span className="text-sm font-medium">
                  {formatMoneda(importeItem(it))}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="text-xs text-destructive hover:underline"
                    aria-label="Eliminar partida"
                  >
                    ✕
                  </button>
                )}
              </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Condiciones, vigencia, tiempos de entrega…"
            />
            {modo === "version" && (
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="motivo">Motivo del cambio (¿Mueve?) *</Label>
                <Input
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ajuste de cantidades / fechas"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatMoneda(totales.subtotal)} />
            <Row label={`IVA`} value={formatMoneda(totales.iva)} />
            <Row label="Total" value={formatMoneda(totales.total)} strong />
            <hr className="my-2" />
            <Row
              label="Costo total"
              value={formatMoneda(totales.costo_total)}
              muted
            />
            <Row
              label={`Margen (${totales.margen_pct}%)`}
              value={formatMoneda(totales.margen)}
              muted
            />
            {error && <p className="pt-2 text-destructive">{error}</p>}
            <Button
              type="button"
              className="mt-3 w-full"
              onClick={enviar}
              disabled={pending}
            >
              {pending
                ? "Guardando…"
                : modo === "version"
                  ? "Guardar nueva versión"
                  : "Crear cotización"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={strong ? "text-base font-bold" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
