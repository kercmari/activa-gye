import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { repo, type GuideCategory, type GuideEntry } from '../data';
import PageHeader from '../components/ui/PageHeader';
import { Loading, EmptyState, ErrorState } from '../components/ui/States';
import { useAsync } from '../components/profile/useAsync';
import GuideEntryCard from '../components/guide/GuideEntryCard';
import { GUIDE_CATEGORIES, countByCategory, filterGuide } from '../components/guide/guideModel';

type Filter = GuideCategory | 'todas';

const NO_ENTRIES: GuideEntry[] = [];

/** Guía de nutrición pública: chips por categoría, buscador y tarjetas Sí / Evita. */
export default function GuiaPage() {
  const guide = useAsync(() => repo.listGuide());
  const [category, setCategory] = useState<Filter>('todas');
  const [query, setQuery] = useState('');

  const entries = guide.status === 'ok' ? guide.data : NO_ENTRIES;
  const counts = useMemo(() => countByCategory(entries), [entries]);
  const visible = useMemo(() => filterGuide(entries, category, query), [entries, category, query]);

  const resetFilters = () => {
    setCategory('todas');
    setQuery('');
  };

  return (
    <>
      <PageHeader
        eyebrow="Guía"
        title="Guía de nutrición VITGO"
        subtitle="Consejos prácticos para comer mejor cada día: qué sí y qué evitar, y cómo hacerlo paso a paso."
        back="/"
      >
        <p className="mt-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200">
          Contenido general; no reemplaza a tu nutricionista.
        </p>
      </PageHeader>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:py-14">
          {guide.status === 'loading' ? <Loading text="Cargando la guía…" /> : null}

          {guide.status === 'error' ? (
            <ErrorState message={guide.message} onRetry={guide.reload} />
          ) : null}

          {guide.status === 'ok' && entries.length === 0 ? (
            <EmptyState
              title="Aún no hay entradas en la guía"
              text="Estamos preparando el contenido. Vuelve pronto."
              action={{ label: 'Volver al inicio', to: '/' }}
            />
          ) : null}

          {guide.status === 'ok' && entries.length > 0 ? (
            <>
              <div className="space-y-5">
                <div role="group" aria-label="Categorías" className="flex flex-wrap gap-2">
                  <CategoryChip
                    label={`Todas (${entries.length})`}
                    active={category === 'todas'}
                    onClick={() => setCategory('todas')}
                  />
                  {GUIDE_CATEGORIES.map((c) => (
                    <CategoryChip
                      key={c.key}
                      label={`${c.label} (${counts[c.key]})`}
                      active={category === c.key}
                      onClick={() => setCategory(c.key)}
                    />
                  ))}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Buscar en la guía…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Buscar en la guía"
                    className="w-full rounded-full border border-slate-200 bg-white py-3 pl-12 pr-5 text-navy-900 outline-none placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                  />
                </div>
              </div>

              {visible.length === 0 ? (
                <EmptyState
                  title="Ningún resultado"
                  text="Prueba con otra palabra o quita el filtro de categoría."
                  action={{ label: 'Ver toda la guía', onClick: resetFilters }}
                />
              ) : (
                <div className="grid gap-6">
                  {visible.map((entry) => <GuideEntryCard key={entry.id} entry={entry} />)}
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'rounded-full px-4 py-2 text-sm font-bold transition-colors',
        active ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 shadow-sm hover:bg-sky-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
