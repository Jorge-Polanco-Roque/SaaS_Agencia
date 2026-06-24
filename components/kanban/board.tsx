"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { TareaColumna } from "@/lib/supabase/database.types";
import { COLUMNAS } from "@/lib/services/kanban";
import { cn } from "@/lib/utils";
import { moverTareaAction } from "@/app/(app)/proyectos/actions";

export interface TareaCard {
  id: string;
  titulo: string;
  columna: TareaColumna;
  orden: number;
  responsable_nombre: string | null;
  fecha_limite: string | null;
}

type Columnas = Record<TareaColumna, TareaCard[]>;

function agrupar(tareas: TareaCard[]): Columnas {
  const out: Columnas = {
    por_hacer: [],
    en_proceso: [],
    bloqueado: [],
    hecho: [],
  };
  for (const t of tareas) out[t.columna].push(t);
  for (const k of Object.keys(out) as TareaColumna[])
    out[k].sort((a, b) => a.orden - b.orden);
  return out;
}

export function KanbanBoard({
  proyectoId,
  tareas,
}: {
  proyectoId: string;
  tareas: TareaCard[];
}) {
  const [cols, setCols] = useState<Columnas>(() => agrupar(tareas));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Resincroniza cuando cambia el CONJUNTO de tareas (alta/baja), no en reorden.
  const sig = useMemo(
    () =>
      tareas
        .map((t) => t.id)
        .sort()
        .join(","),
    [tareas]
  );
  useEffect(() => {
    setCols(agrupar(tareas));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const findColumn = (id: string): TareaColumna | null => {
    if (id in cols) return id as TareaColumna;
    for (const k of Object.keys(cols) as TareaColumna[]) {
      if (cols[k].some((t) => t.id === id)) return k;
    }
    return null;
  };

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = findColumn(activeId);
    const to = findColumn(overId);
    if (!from || !to || from === to) return;

    setCols((prev) => {
      const item = prev[from].find((t) => t.id === activeId);
      if (!item) return prev;
      const overIndex = prev[to].findIndex((t) => t.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : prev[to].length;
      return {
        ...prev,
        [from]: prev[from].filter((t) => t.id !== activeId),
        [to]: [
          ...prev[to].slice(0, insertAt),
          { ...item, columna: to },
          ...prev[to].slice(insertAt),
        ],
      };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!overId) return;

    const col = findColumn(activeId);
    if (!col) return;

    setCols((prev) => {
      const items = prev[col];
      const oldIndex = items.findIndex((t) => t.id === activeId);
      const overIndex = items.findIndex((t) => t.id === overId);
      let next = items;
      if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
        next = [...items];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(overIndex, 0, moved);
      }
      const ordenIds = next.map((t) => t.id);
      // Persiste el movimiento (columna destino + orden completo)
      startTransition(async () => {
        await moverTareaAction({
          proyecto_id: proyectoId,
          tarea_id: activeId,
          columna: col,
          orden_ids: ordenIds,
        });
      });
      return { ...prev, [col]: next };
    });
  }

  const activa = activeId
    ? Object.values(cols)
        .flat()
        .find((t) => t.id === activeId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNAS.map((c) => (
          <Columna key={c.id} id={c.id} label={c.label} items={cols[c.id]} />
        ))}
      </div>
      <DragOverlay>{activa ? <Card t={activa} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function Columna({
  id,
  label,
  items,
}: {
  id: TareaColumna;
  label: string;
  items: TareaCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[160px] flex-col gap-2 rounded-lg border bg-secondary/40 p-3",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <SortableContext
        items={items.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((t) => (
          <SortableCard key={t.id} t={t} />
        ))}
      </SortableContext>
    </div>
  );
}

function SortableCard({ t }: { t: TareaCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: t.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <Card t={t} />
    </div>
  );
}

function Card({ t, overlay }: { t: TareaCard; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "cursor-grab rounded-md border bg-card p-3 shadow-sm active:cursor-grabbing",
        overlay && "shadow-lg"
      )}
    >
      <p className="text-sm font-medium leading-snug">{t.titulo}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{t.responsable_nombre ?? "Sin asignar"}</span>
        {t.fecha_limite && <span>{t.fecha_limite}</span>}
      </div>
    </div>
  );
}
