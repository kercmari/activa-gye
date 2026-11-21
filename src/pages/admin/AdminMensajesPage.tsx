import { useMemo, useState } from 'react';
import { Button, buttonClasses } from '../../components/ui/Button';
import AdminShell from '../../components/admin/AdminShell';
import { formatDate } from '../../components/admin/format';
import { useLoad } from '../../components/admin/useLoad';
import { repo, type ContactMessage } from '../../data';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

export default function AdminMensajesPage() {
  const { state, retry } = useLoad<ContactMessage[]>(() => repo.adminListMessages());
  const [abierto, setAbierto] = useState<string | null>(null);
  const [leidos, setLeidos] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const estaLeido = (m: ContactMessage) => leidos[m.id] ?? m.read;

  const lista = useMemo(() => {
    if (state.status !== 'ok') return [];
    return [...state.data].sort((a, b) => {
      const ua = estaLeido(a) ? 1 : 0;
      const ub = estaLeido(b) ? 1 : 0;
      if (ua !== ub) return ua - ub; // no leídos primero
      return b.created_at.localeCompare(a.created_at);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, leidos]);

  const marcar = async (m: ContactMessage, read: boolean) => {
    setError(null);
    setLeidos((prev) => ({ ...prev, [m.id]: read }));
    try {
      await repo.adminMarkMessageRead(m.id, read);
    } catch (e) {
      setLeidos((prev) => ({ ...prev, [m.id]: !read }));
      setError(errorMessage(e));
    }
  };

  const abrir = (m: ContactMessage) => {
    setAbierto(m.id);
    if (!estaLeido(m)) void marcar(m, true);
  };

  const seleccionado = state.status === 'ok' ? state.data.find((m) => m.id === abierto) ?? null : null;

  return (
    <AdminShell title="Mensajes">
      {error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      {state.status === 'loading' ? <Loading /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      {state.status === 'ok' && state.data.length === 0 ? (
        <EmptyState title="Todavía no hay mensajes" text="Aquí llegan los mensajes del formulario de contacto." action={{ to: '/admin', label: 'Volver al resumen' }} />
      ) : null}

      {state.status === 'ok' && state.data.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <ul className="space-y-3">
            {lista.map((m) => {
              const leido = estaLeido(m);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => abrir(m)}
                    aria-current={abierto === m.id ? 'true' : undefined}
                    className={`w-full rounded-2xl bg-white p-4 text-left shadow-md shadow-navy-900/5 transition-colors hover:bg-slate-50 ${
                      abierto === m.id ? 'ring-2 ring-brand-blue' : ''
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{formatDate(m.created_at)}</span>
                      {leido ? null : <span className="rounded-full bg-sky-50 px-2 py-0.5 font-extrabold text-sky-tag">Nuevo</span>}
                    </span>
                    <span className={`mt-1 block truncate text-navy-900 ${leido ? 'font-semibold' : 'font-extrabold'}`}>{m.subject}</span>
                    <span className={`block truncate text-sm ${leido ? 'text-slate-500' : 'font-bold text-slate-700'}`}>{m.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="h-fit rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
            {seleccionado ? (
              <>
                <p className="text-xs font-bold text-slate-500">{formatDate(seleccionado.created_at)}</p>
                <h2 className="display mt-2 text-2xl text-navy-900">{seleccionado.subject}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  De <strong className="text-navy-900">{seleccionado.name}</strong> · {seleccionado.email}
                </p>
                <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-navy-900">{seleccionado.message}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={`mailto:${seleccionado.email}?subject=${encodeURIComponent(`Re: ${seleccionado.subject}`)}`}
                    className={buttonClasses({ variant: 'primary' })}
                  >
                    Responder por correo
                  </a>
                  {estaLeido(seleccionado) ? (
                    <Button variant="secondary" onClick={() => void marcar(seleccionado, false)}>Marcar como no leído</Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Elige un mensaje de la lista para leerlo.</p>
            )}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
