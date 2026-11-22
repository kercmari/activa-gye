/**
 * Datos de lugares (fase 3, admin): lugares sin precio o sin horario, con un campo rápido para el precio.
 */
import { useState, type FormEvent } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import { useLoad } from '../../components/admin/useLoad';
import PhaseGate from '../../components/PhaseGate';
import { repo, type Place, type Sector } from '../../data';
import { Button, LinkButton } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import Badge from '../../components/ui/Badge';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

type Filtro = 'precio' | 'horario' | 'todos';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'precio', label: 'Sin precio' },
  { value: 'horario', label: 'Sin horario' },
  { value: 'todos', label: 'Todos' },
];

const sinPrecio = (p: Place) => p.price_from == null;
const sinHorario = (p: Place) => p.hours == null;
const completo = (p: Place) => !sinPrecio(p) && !sinHorario(p);

function coincide(p: Place, filtro: Filtro): boolean {
  if (filtro === 'precio') return sinPrecio(p);
  if (filtro === 'horario') return sinHorario(p);
  return true;
}

interface ListaProps {
  initial: Place[];
  sectors: Sector[];
}

function Lista({ initial, sectors }: ListaProps) {
  const [lugares, setLugares] = useState<Place[]>(initial);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  const nombreSector = (id: string | null) => sectors.find((s) => s.id === id)?.name ?? '—';
  const visibles = lugares.filter((p) => coincide(p, filtro));

  const guardar = async (e: FormEvent, lugar: Place) => {
    e.preventDefault();
    const raw = (precios[lugar.id] ?? '').trim();
    const valor = Number(raw);
    if (!raw || !Number.isFinite(valor) || valor < 0) {
      setErrores((prev) => ({ ...prev, [lugar.id]: 'Escribe un precio en USD (0 o más). 0 = gratis.' }));
      return;
    }
    setErrores((prev) => ({ ...prev, [lugar.id]: '' }));
    setGuardando(lugar.id);
    try {
      await repo.adminSavePlace({ ...lugar, price_from: valor });
      const actualizado: Place = { ...lugar, price_from: valor };
      setLugares((prev) =>
        prev.flatMap((p) => {
          if (p.id !== lugar.id) return [p];
          return completo(actualizado) ? [] : [actualizado];
        }),
      );
      setPrecios((prev) => ({ ...prev, [lugar.id]: '' }));
    } catch (error) {
      setErrores((prev) => ({ ...prev, [lugar.id]: errorMessage(error) }));
    } finally {
      setGuardando(null);
    }
  };

  if (lugares.length === 0) {
    return (
      <EmptyState
        title="No hay lugares por completar"
        text="Todos los lugares tienen precio y horario."
        action={{ label: 'Ver lugares', to: '/admin/lugares' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="display text-2xl text-navy-900" aria-live="polite">
          {visibles.length} {visibles.length === 1 ? 'lugar' : 'lugares'} por completar
        </p>
        <div className="w-full sm:w-56">
          <SelectField label="Mostrar" value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
            {FILTROS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </SelectField>
        </div>
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          title="Nada en este filtro"
          text="Ningún lugar cumple este filtro. Prueba con «Todos»."
          action={{ label: 'Ver todos', onClick: () => setFiltro('todos') }}
        />
      ) : (
        <ul className="space-y-4">
          {visibles.map((p) => (
            <li key={p.id} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-navy-900">{p.name}</h2>
                  <p className="text-sm text-slate-600">Sector: {nombreSector(p.sector_id)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sinPrecio(p) ? <Badge tone="orange">Falta precio</Badge> : null}
                    {sinHorario(p) ? <Badge tone="orange">Falta horario</Badge> : null}
                  </div>
                </div>
                <LinkButton to={`/admin/lugares/${p.id}`} variant="secondary" size="md">Editar todo</LinkButton>
              </div>

              {sinPrecio(p) ? (
                <form
                  className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,14rem)_auto] sm:items-end"
                  onSubmit={(e) => guardar(e, p)}
                  noValidate
                >
                  <TextField
                    label="Precio desde (USD)"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={precios[p.id] ?? ''}
                    onChange={(e) => setPrecios((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    error={errores[p.id] || undefined}
                  />
                  <Button type="submit" variant="blue" disabled={guardando === p.id}>
                    {guardando === p.id ? 'Guardando…' : 'Guardar'}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Contenido() {
  const { state, retry } = useLoad(async () => {
    const [lugares, sectores] = await Promise.all([repo.adminListIncompletePlaces(), repo.listSectors()]);
    return { lugares, sectores };
  }, []);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={retry} />;
  return <Lista initial={state.data.lugares} sectors={state.data.sectores} />;
}

export default function AdminDatosLugaresPage() {
  return (
    <AdminShell title="Datos de lugares">
      <PhaseGate phase={3} title="Datos de lugares">
        <Contenido />
      </PhaseGate>
    </AdminShell>
  );
}
