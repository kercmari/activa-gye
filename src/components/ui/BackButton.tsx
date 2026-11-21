import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

interface Props {
  /** A dónde ir si no hay historial dentro del sitio. */
  fallback?: string;
  className?: string;
}

/** "← Volver": regresa en el historial si se puede; si no, va a `fallback`. */
export default function BackButton({ fallback = '/', className = '' }: Props) {
  const navigate = useNavigate();
  const onClick = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(fallback);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold text-navy-900 transition-colors hover:bg-slate-100 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver
    </button>
  );
}
