import type { ReactNode } from 'react';
import { Button, LinkButton } from './Button';

/** Estado cargando. */
export function Loading({ text = 'Cargando…' }: { text?: string }) {
  return (
    <div role="status" className="py-16 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

interface EmptyProps {
  title: string;
  text: string;
  /** Botón útil: { to, label } para enlace, o { onClick, label } para acción. */
  action?: { label: string; to?: string; onClick?: () => void };
  children?: ReactNode;
}

/** Estado vacío con un botón útil. */
export function EmptyState({ title, text, action }: EmptyProps) {
  return (
    <div className="rounded-[1.75rem] bg-white px-6 py-12 text-center shadow-xl shadow-navy-900/5">
      <h2 className="display text-2xl text-navy-900">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-slate-600">{text}</p>
      {action ? (
        <div className="mt-6 flex justify-center">
          {action.to ? (
            <LinkButton to={action.to} variant="primary">{action.label}</LinkButton>
          ) : (
            <Button variant="primary" onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface ErrorProps {
  /** Mensaje ya en español (AppError.message o el genérico). */
  message: string;
  onRetry: () => void;
}

/** Estado de error con botón "Reintentar". */
export function ErrorState({ message, onRetry }: ErrorProps) {
  return (
    <div role="alert" className="rounded-[1.75rem] border border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="font-bold text-red-700">{message}</p>
      <div className="mt-5 flex justify-center">
        <Button variant="danger" onClick={onRetry}>Reintentar</Button>
      </div>
    </div>
  );
}

/** Mensaje de error genérico para mostrar: el de un AppError o el de respaldo. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AppError' && error.message) return error.message;
  return 'Algo salió mal. Inténtalo de nuevo.';
}
