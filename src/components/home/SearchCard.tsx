import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { repo, type Sector, type Sport, type ServiceId } from '../../data';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/Field';
import { buildSearchParams, type SearchState } from './searchParams';

const PRICE_OPTIONS = [
  { value: '', label: 'Todos los precios' },
  { value: 'gratis', label: 'Gratis' },
  { value: 'hasta20', label: 'Hasta $20' },
  { value: '20a40', label: '$20 a $40' },
  { value: 'mas40', label: 'Más de $40' },
];

const SCHEDULE_OPTIONS = [
  { value: '', label: 'Cualquier horario' },
  { value: 'manana', label: 'Mañana (5:00–12:00)' },
  { value: 'tarde', label: 'Tarde (12:00–18:00)' },
  { value: 'noche', label: 'Noche (18:00–23:00)' },
];

const SERVICE_OPTIONS: { id: ServiceId; label: string }[] = [
  { id: 'duchas', label: 'Duchas' },
  { id: 'parqueo', label: 'Parqueo' },
  { id: 'entrenador', label: 'Entrenador personal' },
  { id: 'casilleros', label: 'Casilleros' },
  { id: 'clases_grupales', label: 'Clases grupales' },
  { id: 'piscina', label: 'Piscina' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'cafeteria', label: 'Cafetería' },
];

const EMPTY: SearchState = {
  nombre: '', sector: '', deporte: '', precio: '', horario: '', servicios: [], cerca: false,
};

/** Buscador de la portada. Lleva a /lugares con los filtros en la URL. */
export default function SearchCard() {
  const navigate = useNavigate();
  const [state, setState] = useState<SearchState>(EMPTY);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    let alive = true;
    repo.listSectors()
      .then((list) => { if (alive) setSectors(list); })
      .catch(() => { if (alive) setSectors([]); });
    repo.listSports()
      .then((list) => { if (alive) setSports(list); })
      .catch(() => { if (alive) setSports([]); });
    return () => { alive = false; };
  }, []);

  const set = <K extends keyof SearchState>(key: K, value: SearchState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const toggleService = (id: string) =>
    setState((prev) => ({
      ...prev,
      servicios: prev.servicios.includes(id) ? prev.servicios.filter((s) => s !== id) : [...prev.servicios, id],
    }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/lugares?' + buildSearchParams(state));
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Buscar lugares"
      className="rounded-[1.75rem] bg-white p-6 shadow-2xl shadow-navy-900/15 md:p-8"
    >
      <p className="eyebrow">Encuentra tu próximo lugar</p>
      <h2 className="display mt-2 text-3xl text-navy-900 md:text-4xl">¿Cómo quieres moverte hoy?</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <TextField
          label="Nombre"
          placeholder="Ej. Olympic Gym"
          value={state.nombre}
          onChange={(e) => set('nombre', e.target.value)}
        />
        <SelectField label="Zona o sector" value={state.sector} onChange={(e) => set('sector', e.target.value)}>
          <option value="">Todas las zonas</option>
          {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </SelectField>
        <SelectField label="Actividad" value={state.deporte} onChange={(e) => set('deporte', e.target.value)}>
          <option value="">Todas las actividades</option>
          {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </SelectField>
        <SelectField label="Precio" value={state.precio} onChange={(e) => set('precio', e.target.value)}>
          {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </SelectField>
        <SelectField label="Horario" value={state.horario} onChange={(e) => set('horario', e.target.value)}>
          {SCHEDULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </SelectField>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          aria-label="Más filtros"
          aria-expanded={moreOpen}
          aria-controls="mas-filtros"
          onClick={() => setMoreOpen((v) => !v)}
          className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-sm font-bold text-sky-tag hover:bg-sky-50"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Más filtros
        </button>
        <Button type="submit" variant="blue" size="lg" iconRight={Search} className="w-full sm:w-auto">
          Buscar lugares
        </Button>
      </div>

      {moreOpen ? (
        <fieldset id="mas-filtros" className="mt-6 border-t border-slate-100 pt-6">
          <legend className="mb-4 text-sm font-bold text-navy-900">Filtros adicionales</legend>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-blue"
              checked={state.cerca}
              onChange={(e) => set('cerca', e.target.checked)}
            />
            Cerca de mí
          </label>
          <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Servicios</p>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            {SERVICE_OPTIONS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-blue"
                  checked={state.servicios.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </form>
  );
}
