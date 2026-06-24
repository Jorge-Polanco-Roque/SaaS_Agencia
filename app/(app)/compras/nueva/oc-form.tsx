"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatMoneda } from "@/lib/services/calculos";
import { importeOC, totalesOrdenCompra } from "@/lib/services/finanzas";
import { nuevaOrdenCompraAction } from "../actions";

interface Opt {
  id: string;
  nombre: string;
}
interface ProdOpt extends Opt {
  unidad: string;
  costo: number;
}
interface ItemRow {
  producto_id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
}
const fila = (): ItemRow => ({
  producto_id: "",
  descripcion: "",
  cantidad: 1,
  unidad: "pieza",
  costo_unitario: 0,
});

export function OcForm({
  proveedores,
  proyectos,
  productos,
}: {
  proveedores: Opt[];
  proyectos: Opt[];
  productos: ProdOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [ivaTasa, setIvaTasa] = useState(0.16);
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemRow[]>([fila()]);

  const totales = useMemo(
    () => totalesOrdenCompra(items, ivaTasa),
    [items, ivaTasa]
  );

  function setItem(i: number, patch: Partial<ItemRow>) {
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function elegirProducto(i: number, id: string) {
    const p = productos.find((x) => x.id === id);
    if (!p) return setItem(i, { producto_id: "" });
    setItem(i, {
      producto_id: p.id,
      descripcion: p.nombre,
      unidad: p.unidad,
      costo_unitario: p.costo,
    });
  }

  function enviar() {
    setError(null);
    start(async () => {
      const res = await nuevaOrdenCompraAction({
        proveedor_id: proveedorId,
        proyecto_id: proyectoId || undefined,
        iva_tasa: ivaTasa,
        notas: notas || undefined,
        items: items.map((it) => ({
          producto_id: it.producto_id || undefined,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          unidad: it.unidad,
          costo_unitario: it.costo_unitario,
        })),
      });
      if (res.error) return setError(res.error);
      router.push(`/compras/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="oc-prov">Proveedor *</Label>
            <Select id="oc-prov" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">— Selecciona —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Proyecto</Label>
            <Select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
              <option value="">— Sin proyecto —</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>IVA (%)</Label>
            <Input
              type="number"
              value={Math.round(ivaTasa * 100)}
              onChange={(e) => setIvaTasa((Number(e.target.value) || 0) / 100)}
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
            onClick={() => setItems((p) => [...p, fila()])}
          >
            + Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-3 rounded-lg border bg-secondary/30 p-3 md:grid-cols-12">
              <div className="space-y-1 md:col-span-3">
                <Label className="text-xs">Producto</Label>
                <Select value={it.producto_id} onChange={(e) => elegirProducto(i, e.target.value)}>
                  <option value="">— Manual —</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1 md:col-span-4">
                <Label htmlFor={`oc-desc-${i}`} className="text-xs">
                  Descripción
                </Label>
                <Input
                  id={`oc-desc-${i}`}
                  value={it.descripcion}
                  onChange={(e) => setItem(i, { descripcion: e.target.value })}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Cantidad</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={it.cantidad}
                  onChange={(e) => setItem(i, { cantidad: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={`oc-costo-${i}`} className="text-xs">
                  Costo unit.
                </Label>
                <Input
                  id={`oc-costo-${i}`}
                  type="number"
                  step="0.01"
                  value={it.costo_unitario}
                  onChange={(e) => setItem(i, { costo_unitario: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end justify-between md:col-span-1">
                <span className="text-sm font-medium">{formatMoneda(importeOC(it))}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                    className="text-xs text-destructive hover:underline"
                  >
                    ✕
                  </button>
                )}
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
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoneda(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span>{formatMoneda(totales.iva)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="text-base font-bold">{formatMoneda(totales.total)}</span>
            </div>
            {error && <p className="text-destructive">{error}</p>}
            <Button type="button" className="mt-2 w-full" onClick={enviar} disabled={pending}>
              {pending ? "Guardando…" : "Crear orden de compra"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
