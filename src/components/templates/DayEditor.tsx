import { useState, type FormEvent } from 'react';
import { repo, type PlanTemplateItem, type PlanTemplateItemInput, type TrialItemKind } from '../../data';
import { Button } from '../ui/Button';
import { SelectField, TextArea, TextField } from '../ui/Field';
import { errorMessage } from '../ui/States';
import ConfirmDialog from '../profile/ConfirmDialog';
import { DAYS, KIND_LABELS, isValidTime, sortItems } from './labels';

interface ItemDraft {
  id?: string;
  at_time: string;
  kind: TrialItemKind;
  title: string;
  detail: string;
  sort: number;
}

type ItemErrors = Partial<Record<'at_time' | 'title', string>>;

function draftFrom(item?: PlanTemplateItem, sort = 0): ItemDraft {
  return {
    id: item?.id,
    at_time: item?.at_time ?? '08:00',
    kind: item?.kind ?? 'comida',
    title: item?.title ?? '',
    detail: item?.detail ?? '',
    sort: item?.sort ?? sort,
  };
}

function ItemForm({ draft, busy, error, onChange, onCancel, onSubmit }: {
  draft: ItemDraft;
  busy: boolean;
  error: string | null;
  onChange: (d: ItemDraft) => void;
  onCancel: () => void;
  onSubmit: (d: ItemDraft) => void;
}) {
  const [errors, setErrors] = useState<ItemErrors>({});
  const isNew = !draft.id;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: ItemErrors = {};
    if (!isValidTime(draft.at_time)) next.at_time = 'Usa la hora en formato HH:MM, por ejemplo 07:30.';
    if (!draft.title.trim()) next.title = 'Escribe el nombre de la comida o actividad.';
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(draft);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-extrabold text-navy-900">{isNew ? 'Agregar al día' : 'Editar ítem'}</h3>
      <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)]">
        <TextField label="Hora" type="time" value={draft.at_time} onChange={(e) => onChange({ ...draft, at_time: e.target.value })} error={errors.at_time} />
        <SelectField label="Tipo" value={draft.kind} onChange={(e) => onChange({ ...draft, kind: e.target.value as TrialItemKind })}>
          {(Object.keys(KIND_LABELS) as TrialItemKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </SelectField>
      </div>
      <TextField label="Título" value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} error={errors.title} placeholder="Ej.: Desayuno de avena con fruta" />
      <TextArea label="Detalle (opcional)" rows={2} value={draft.detail} onChange={(e) => onChange({ ...draft, detail: e.target.value })} />
      {error ? <p role="alert" className="font-semibold text-red-600">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar ítem'}</Button>
      </div>
    </form>
  );
}

interface Props {
  templateId: string;
  dayNumber: number;
  /** Ítems de todos los días, para calcular el orden y copiar. */
  items: PlanTemplateItem[];
  /** Vuelve a leer la plantilla tras un cambio. */
  onChanged: (items: PlanTemplateItem[]) => void;
}

/** Ítems de un día: agregar, editar, borrar y copiar a otros días. */
export default function DayEditor({ templateId, dayNumber, items, onChanged }: Props) {
  const dayItems = sortItems(items.filter((i) => i.day_number === dayNumber));
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PlanTemplateItem | null>(null);
  const [copying, setCopying] = useState(false);
  const [targets, setTargets] = useState<number[]>([]);
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  async function refresh(): Promise<PlanTemplateItem[]> {
    const fresh = await repo.adminGetTemplate(templateId);
    const next = fresh?.items ?? [];
    onChanged(next);
    return next;
  }

  async function saveItem(d: ItemDraft) {
    setBusy(true);
    setError(null);
    try {
      const sort = d.id ? d.sort : (items.reduce((m, i) => Math.max(m, i.sort), 0) + 1);
      const input: PlanTemplateItemInput = {
        id: d.id,
        template_id: templateId,
        day_number: dayNumber,
        at_time: d.at_time,
        kind: d.kind,
        title: d.title.trim(),
        detail: d.detail.trim() || null,
        sort,
      };
      await repo.adminSaveTemplateItem(input);
      await refresh();
      setDraft(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await repo.adminDeleteTemplateItem(deleting.id);
      await refresh();
      setDeleting(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function copyDay() {
    if (targets.length === 0 || dayItems.length === 0) return;
    setCopyBusy(true);
    setCopyMsg(null);
    setError(null);
    let calls = 0;
    try {
      let sort = items.reduce((m, i) => Math.max(m, i.sort), 0);
      for (const day of targets) {
        for (const item of dayItems) {
          sort += 1;
          await repo.adminSaveTemplateItem({
            template_id: templateId,
            day_number: day,
            at_time: item.at_time,
            kind: item.kind,
            title: item.title,
            detail: item.detail,
            sort,
          });
          calls += 1;
        }
      }
      await refresh();
      setCopyMsg(`Se copiaron ${dayItems.length} ítems a ${targets.length} día(s).`);
      setTargets([]);
      setCopying(false);
    } catch (e) {
      setError(`${errorMessage(e)} Se copiaron ${calls} de ${dayItems.length * targets.length} ítems; revisa los días antes de volver a copiar.`);
      await refresh().catch(() => undefined);
    } finally {
      setCopyBusy(false);
    }
  }

  const otherDays = DAYS.filter((d) => d !== dayNumber);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-2xl text-navy-900">Día {dayNumber}</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => { setCopying((c) => !c); setCopyMsg(null); }} disabled={dayItems.length === 0}>
            Copiar este día a…
          </Button>
          <Button variant="primary" onClick={() => { setDraft(draftFrom(undefined, items.length)); setError(null); }} disabled={busy || draft !== null}>
            Agregar ítem
          </Button>
        </div>
      </div>

      {copying ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-bold text-navy-900">Elige los días donde se agregan estos {dayItems.length} ítems</p>
          <div className="flex flex-wrap gap-3">
            {otherDays.map((d) => (
              <label key={d} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={targets.includes(d)}
                  onChange={(e) => setTargets((t) => (e.target.checked ? [...t, d] : t.filter((x) => x !== d)))}
                />
                Día {d}
              </label>
            ))}
          </div>
          <p className="text-sm text-slate-500">Los ítems se agregan al final de cada día elegido; no borran lo que ya tiene.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => { setCopying(false); setTargets([]); }} disabled={copyBusy}>Cancelar</Button>
            <Button variant="primary" onClick={copyDay} disabled={copyBusy || targets.length === 0}>
              {copyBusy ? 'Copiando…' : 'Copiar'}
            </Button>
          </div>
        </div>
      ) : null}

      {copyMsg ? <p role="status" className="font-semibold text-emerald-700">{copyMsg}</p> : null}

      {draft ? (
        <ItemForm
          draft={draft}
          busy={busy}
          error={error}
          onChange={setDraft}
          onCancel={() => { setDraft(null); setError(null); }}
          onSubmit={saveItem}
        />
      ) : null}

      {error && !draft ? <p role="alert" className="font-semibold text-red-600">{error}</p> : null}

      {dayItems.length === 0 && !draft ? (
        <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-sm">
          <p className="font-bold text-navy-900">Este día todavía no tiene ítems.</p>
          <p className="mt-2 text-sm text-slate-500">Agrega comidas, rutinas o hábitos con su hora.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
          {dayItems.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
              <span className="w-16 shrink-0 font-extrabold tabular-nums text-brand-orange">{item.at_time}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy-900">{item.title}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{KIND_LABELS[item.kind]}</p>
                {item.detail ? <p className="mt-1 text-sm text-slate-600">{item.detail}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="md" onClick={() => { setDraft(draftFrom(item)); setError(null); }} disabled={busy}>Editar</Button>
                <Button variant="danger" size="md" onClick={() => setDeleting(item)} disabled={busy}>Borrar</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleting ? (
        <ConfirmDialog
          title="¿Borrar este ítem?"
          text={`Se borra «${deleting.title}» del día ${dayNumber}.`}
          confirmLabel="Borrar ítem"
          busy={busy}
          onConfirm={removeItem}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
