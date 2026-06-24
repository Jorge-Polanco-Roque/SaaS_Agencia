"use client";

import { useActionState, useEffect, useRef } from "react";

type State = { ok?: boolean; error?: string };

/**
 * Formulario que envuelve un Server Action con useActionState.
 * Muestra el error y limpia el formulario al completar con éxito.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
