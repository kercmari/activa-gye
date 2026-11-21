import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import AdminShell from '../../components/admin/AdminShell';
import { useLoad } from '../../components/admin/useLoad';
import { repo, type Place, type Sector, type Sport } from '../../data';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';
import { TextField } from '../../components/ui/Field';

const PAGE_SIZE = 50;
type Estado = 'publicados' | 'ocultos' | 'todos';
const ESTADOS: { value: Estado; label: string }[] = [
  { value: 'publicados', label: 'Publicados' },
  { value: 'ocultos', label: 'Ocultos' },
  { value: 'todos', label: 'Todos' },
];

interface Datos {
  lugares: Place[];
  sectores: Sector[];
  deportes: Sport[];
}

function precio(p: Place): string {
  if (p.price_from === null) return 'Consultar';
  if (p.price_from === 0) return 'Gratis';
  return `Desde $${p.price_from}`;
}

export default function AdminLugaresPage() {
  const location = useLocation();
  const aviso = (location.state as { aviso?: string } | null)?.aviso ?? null;
  const [params, setParams] = useSearchParams();
  const estadoParam = params.get('estado');
  const estado: Estado = estadoParam === 'ocultos' || estadoParam === 'todos' ? estadoParam : 'publicados';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);

  const [nombre, setNombre] = useState('');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { state, retry } = useLoad<Datos>(async () => {
    const [lugares, sectores, deportes] = await Promise.all([
      repo.adminListPlaces(),
      repo.listSectors(),
      repo.listSports(),
    ]);
    return { lugares, sectores, deportes };
  });

  const publicado = (p: Place) => overrides[p.id] ?? p.published;

  const filtrados = useMemo(() => {
    if (state.status !== 'ok') return [];
    const term = nombre.trim().toLowerCase();
    return state.data.lugares
      .filter((p) => estado === 'todos' || (estado === 'publicados' ? (overrides[p.id] ?? p.published) : !(overrides[p.id] ?? p.published)))
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [state, nombre, estado, overrides]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const actual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((actual - 1) * PAGE_SIZE, actual * PAGE_SIZE);

  const cambiarPagina = (n: number) => {
    const next = new URLSearchParams(params);
    next.set('pagina', String(n));
    setParams(next);
  };

  const cambiarEstado = (value: Estado) => {
    const next = new URLSearchParams(params);
    next.set('estado', value);
    next.delete('pagina');
    setParams(next);
  };

  const alternar = async (p: Place) => {
    const nuevo = !publicado(p);
    setBusy(p.id);
    setError(null);
    setOverrides((o) => ({ ...o, [p.id]: nuevo }));
    try {
      await repo.adminSetPublished(p.id, nuevo);
    } catch (e) {
      setOverrides((o) => ({ ...o, [p.id]: !nuevo }));
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const nombreSector = (datos: Datos, id: string | null) => datos.sectores.find((s) => s.id === id)?.name ?? '—';
  const nombresDeportes = (datos: Datos, ids: string[]) =>
    ids.map((id) => datos.deportes.find((d) => d.id === id)?.name ?? id).join(', ') || '—';

  return (
    <AdminShell title="Lugares">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Estado de publicación">
          {ESTADOS.map((e) => (
            <button
              key={e.value}
              type="button"
              aria-pressed={estado === e.value}
              onClick={() => cambiarEstado(e.value)}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${
                estado === e.value ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 hover:bg-slate-100'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="md:w-72">
            <TextField label="Buscar por nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Gimnasio" />
          </div>
          <LinkButton to="/admin/lugares/nuevo" variant="primary">Nuevo lugar</LinkButton>
        </div>
      </div>

      {aviso ? <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{aviso}</p> : null}
      {error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      {state.status === 'loading' ? <Loading /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}

      {state.status === 'ok' && state.data.lugares.length === 0 ? (
        <EmptyState title="Todavía no hay lugares" text="Crea el primero o importa lugares desde OpenStreetMap." action={{ to: '/admin/lugares/nuevo', label: 'Nuevo lugar' }} />
      ) : null}

      {state.status === 'ok' && state.data.lugares.length > 0 && filtrados.length === 0 ? (
        <EmptyState
          title="Ningún lugar coincide"
          text="Prueba con otro nombre o cambia el filtro de publicación."
          action={{ onClick: () => { setNombre(''); cambiarEstado('todos'); }, label: 'Ver todos' }}
        />
      ) : null}

      {state.status === 'ok' && visibles.length > 0 ? (() => {
        const datos = state.data;
        return (
          <>
            <div className="overflow-x-auto rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Nombre</th>
                    <th scope="col" className="px-4 py-3">Sector</th>
                    <th scope="col" className="px-4 py-3">Deportes</th>
                    <th scope="col" className="px-4 py-3">Precio</th>
                    <th scope="col" className="px-4 py-3">Horario</th>
                    <th scope="col" className="px-4 py-3">Origen</th>
                    <th scope="col" className="px-4 py-3">Publicado</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibles.map((p) => (
                    <tr key={p.id} className="align-middle">
                      <td className="px-4 py-3 font-bold text-navy-900">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600">{nombreSector(datos, p.sector_id)}</td>
                      <td className="px-4 py-3 text-slate-600">{nombresDeportes(datos, p.sport_ids)}</td>
                      <td className="px-4 py-3 text-slate-600">{precio(p)}</td>
                      <td className="px-4 py-3 text-slate-600">{p.hours ? 'Sí' : 'No'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.source === 'osm' ? 'OSM' : 'Admin'}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={publicado(p)}
                          aria-label={`Publicado: ${p.name}`}
                          disabled={busy === p.id}
                          onClick={() => void alternar(p)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${publicado(p) ? 'bg-brand-blue' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${publicado(p) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/lugares/${p.id}`} className="font-extrabold text-brand-blue hover:underline">Editar</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 ? (
              <nav aria-label="Paginación" className="mt-6 flex items-center justify-between gap-4">
                <Button variant="secondary" disabled={actual <= 1} onClick={() => cambiarPagina(actual - 1)}>Anterior</Button>
                <p className="text-sm font-bold text-slate-600">Página {actual} de {totalPaginas}</p>
                <Button variant="secondary" disabled={actual >= totalPaginas} onClick={() => cambiarPagina(actual + 1)}>Siguiente</Button>
              </nav>
            ) : null}
          </>
        );
      })() : null}
    </AdminShell>
  );
}
