import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { repo, type PlanTemplate, type PlanTemplateItem, type TemplateStatus } from '../../data';
import AdminShell from '../../components/admin/AdminShell';
import { Button, LinkButton } from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';
import ConfirmDialog from '../../components/profile/ConfirmDialog';
import { useAsync } from '../../components/profile/useAsync';
import DayEditor from '../../components/templates/DayEditor';
import TemplateForm from '../../components/templates/TemplateForm';
import { toInput, valuesFrom, type TemplateFormValues } from '../../components/templates/formValues';
import { DAYS, sortItems } from '../../components/templates/labels';

interface Loaded {
  template: PlanTemplate | null;
  items: PlanTemplateItem[];
}

/** Editor de una plantilla (`nuevo` crea una). Criterios arriba y 7 días en pestañas. */
function TemplateEditor({ template, initialItems }: { template: PlanTemplate | null; initialItems: PlanTemplateItem[] }) {
  const navigate = useNavigate();
  const isNew = template === null;
  const [status, setStatus] = useState<TemplateStatus>(template?.status ?? 'borrador');
  const [items, setItems] = useState<PlanTemplateItem[]>(initialItems);
  const [day, setDay] = useState<number>(1);
  const [approveFor, setApproveFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function save(values: TemplateFormValues) {
    const result = toInput(values, template?.id);
    if (!result.ok) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const row = await repo.adminSaveTemplate({ ...result.input, status });
      if (isNew) {
        navigate(`/admin/plantillas/${row.id}`, { replace: true });
      } else {
        setSaved(true);
      }
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeTemplate() {
    if (!template) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await repo.adminDeleteTemplate(template.id);
      navigate('/admin/plantillas', { replace: true });
    } catch (e) {
      setDeleteError(errorMessage(e));
      setDeleting(false);
    }
  }

  const initial = valuesFrom(template);
  const sorted = sortItems(items);

  return (
    <>
      <TemplateForm
        initial={initial}
        isNew={isNew}
        busy={saving}
        serverError={saveError}
        status={status}
        onStatusChange={(next) => setStatus(next)}
        onRequestApprove={(author) => setApproveFor(author)}
        onSubmit={save}
      />
      {saved ? <p role="status" className="mt-4 font-semibold text-emerald-700">Cambios guardados.</p> : null}

      <section className="mt-10 space-y-6" aria-label="Días de la semana">
        {isNew ? (
          <div className="rounded-[1.75rem] bg-white px-6 py-10 text-center shadow-xl shadow-navy-900/5">
            <p className="font-bold text-navy-900">Guarda la plantilla para armar sus 7 días.</p>
            <p className="mt-2 text-sm text-slate-500">Cuando se guarde, aquí aparecerán las pestañas Día 1 a Día 7.</p>
          </div>
        ) : (
          <>
            <div role="tablist" aria-label="Días" className="flex gap-2 overflow-x-auto pb-1">
              {DAYS.map((d) => {
                const count = sorted.filter((i) => i.day_number === d).length;
                const selected = day === d;
                return (
                  <button
                    key={d}
                    type="button"
                    role="tab"
                    id={`dia-${d}`}
                    aria-selected={selected}
                    aria-controls="panel-dia"
                    onClick={() => setDay(d)}
                    className={[
                      'shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition',
                      selected ? 'bg-navy-900 text-white' : 'bg-white text-slate-600 shadow-sm hover:text-navy-900',
                    ].join(' ')}
                  >
                    Día {d} <span className="font-semibold opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
            <div role="tabpanel" id="panel-dia" aria-labelledby={`dia-${day}`} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
              <DayEditor templateId={template.id} dayNumber={day} items={items} onChanged={setItems} />
            </div>
          </>
        )}
      </section>

      {template ? (
        <section className="mt-12 rounded-[1.75rem] border border-red-200 bg-red-50 p-6">
          <h2 className="font-extrabold text-red-700">Borrar plantilla</h2>
          <p className="mt-1 text-sm text-slate-600">Se borran la plantilla y todos sus ítems. Esta acción no se puede deshacer.</p>
          {deleteError ? <p role="alert" className="mt-3 font-semibold text-red-600">{deleteError}</p> : null}
          <div className="mt-4">
            <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={deleting}>Borrar plantilla</Button>
          </div>
        </section>
      ) : null}

      {approveFor !== null ? (
        <ConfirmDialog
          title="¿Aprobar esta plantilla?"
          text={`¿Una nutricionista revisó este plan? Se mostrará como firmado por ${approveFor || 'la autora del plan'}.`}
          confirmLabel="Sí, una nutricionista lo revisó"
          onConfirm={() => { setStatus('aprobada'); setApproveFor(null); }}
          onCancel={() => setApproveFor(null)}
        />
      ) : null}

      {deleteOpen && template ? (
        <ConfirmDialog
          title="¿Borrar la plantilla?"
          text={`Se borra «${template.name}» con todos sus días. Esta acción no se puede deshacer.`}
          confirmLabel="Borrar plantilla"
          busy={deleting}
          onConfirm={removeTemplate}
          onCancel={() => setDeleteOpen(false)}
        />
      ) : null}
    </>
  );
}

export default function AdminPlantillaPage() {
  const { id = '' } = useParams();
  const isNew = id === 'nuevo';
  const load = useAsync<Loaded | 'missing'>(async () => {
    if (isNew) return { template: null, items: [] };
    const found = await repo.adminGetTemplate(id);
    if (!found) return 'missing';
    return { template: found.template, items: found.items };
  }, [id]);

  return (
    <AdminShell title={isNew ? 'Nueva plantilla' : 'Editar plantilla'}>
      <PageHeader
        eyebrow="Semana gratis"
        title={isNew ? 'Nueva plantilla' : load.status === 'ok' && load.data !== 'missing' && load.data.template ? load.data.template.name : 'Editar plantilla'}
        subtitle="Define a quién le toca, el estado de revisión y los 7 días del plan."
        back="/admin/plantillas"
      />

      {load.status === 'loading' ? <Loading text="Cargando plantilla…" /> : null}

      {load.status === 'error' ? <ErrorState message={load.message} onRetry={load.reload} /> : null}

      {load.status === 'ok' && load.data === 'missing' ? (
        <EmptyState
          title="No encontramos esta plantilla"
          text="Puede que se haya borrado. Vuelve a la lista para elegir otra."
          action={{ label: 'Volver a plantillas', to: '/admin/plantillas' }}
        />
      ) : null}

      {load.status === 'ok' && load.data !== 'missing' ? (
        <div className="mt-8">
          <TemplateEditor key={id} template={load.data.template} initialItems={load.data.items} />
        </div>
      ) : null}

      <div className="mt-8">
        <LinkButton to="/admin/plantillas" variant="ghost">← Volver a la lista</LinkButton>
      </div>
    </AdminShell>
  );
}
