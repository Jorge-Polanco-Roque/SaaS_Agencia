export function PageHeader({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{titulo}</h1>
        {descripcion && (
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap gap-2 sm:shrink-0">{children}</div>
      )}
    </header>
  );
}
