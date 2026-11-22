import { useState } from 'react';
import { Link } from 'react-router';
import { repo, type PlanTemplate, type TemplateStatus } from '../../data';
import AdminShell from '../../components/admin/AdminShell';
import Badge from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import PageHeader from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, Loading } from '../../components/ui/States';
import { useAsync } from '../../components/profile/useAsync';
import { audienceText, STATUS_LABELS } from '../../components/templates/labels';

type Filter = 'todas' | TemplateStatus;

function TemplateCard({ t }: { t: PlanTemplate }) {
  return (
    <li>
      <Link
        to={`/admin/plantillas/${t.id}`}
        className="block rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={t.status === 'aprobada' ? 'green' : 'slate'}>{STATUS_LABELS[t.status]}</Badge>
          {t.is_fallback ? <Badge tone="blue">Respaldo</Badge> : null}
        </div>
        <h2 className="mt-3 text-lg font-extrabold text-navy-900">{t.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{audienceText(t)}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-slate-500">
          <span>{t.kcal_base} kcal base</span>
          <span>{t.items_count} ítems</span>
          <span>Firma: {t.author_name}</span>
        </div>
      </Link>
    </li>
  );
}

export default function AdminPlantillasPage() {
  const list = useAsync(() => repo.adminListTemplates());
  const [filter, setFilter] = useState<Filter>('todas');

  return (
    <AdminShell title="Plantillas de la semana gratis">
      <PageHeader
        eyebrow="Semana gratis"
        title="Plantillas"
        subtitle="Cada plantilla es un plan de 7 días. La base elige una por IMC, edad, género y objetivo de la persona."
        back="/admin"
      >
        <LinkButton to="/admin/plantillas/nuevo" variant="primary">Nueva plantilla</LinkButton>
      </PageHeader>

      {list.status === 'loading' ? <Loading text="Cargando plantillas…" /> : null}

      {list.status === 'error' ? <ErrorState message={list.message} onRetry={list.reload} /> : null}

      {list.status === 'ok' && list.data.length === 0 ? (
        <EmptyState
          title="Todavía no hay plantillas"
          text="Crea la primera plantilla para que las personas reciban su semana gratis. Las nuevas empiezan como borrador."
          action={{ label: 'Nueva plantilla', to: '/admin/plantillas/nuevo' }}
        />
      ) : null}

      {list.status === 'ok' && list.data.length > 0 ? (
        <>
          <div className="mt-8 flex flex-wrap items-end gap-4">
            <div className="w-full max-w-xs">
              <SelectField label="Estado" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                <option value="todas">Todas</option>
                <option value="borrador">Borrador</option>
                <option value="aprobada">Aprobada</option>
              </SelectField>
            </div>
          </div>
          {(() => {
            const visible = list.data.filter((t) => filter === 'todas' || t.status === filter);
            if (visible.length === 0) {
              return (
                <div className="mt-6 rounded-[1.75rem] bg-white px-6 py-10 text-center shadow-xl shadow-navy-900/5">
                  <p className="font-bold text-navy-900">No hay plantillas con ese estado.</p>
                  <div className="mt-4">
                    <Button variant="secondary" onClick={() => setFilter('todas')}>Ver todas</Button>
                  </div>
                </div>
              );
            }
            return (
              <ul aria-label="Plantillas" className="mt-6 grid gap-5 md:grid-cols-2">
                {visible.map((t) => <TemplateCard key={t.id} t={t} />)}
              </ul>
            );
          })()}
        </>
      ) : null}
    </AdminShell>
  );
}
