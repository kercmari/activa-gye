import { useState, type FormEvent } from 'react';
import { repo, type GuideCategory, type GuideEntry, type GuideEntryInput } from '../../data';
import { Button } from '../ui/Button';
import { SelectField, TextArea, TextField } from '../ui/Field';
import { errorMessage } from '../ui/States';
import { GUIDE_CATEGORIES, linesToList, listToLines } from './guideModel';

interface Props {
  /** Entrada a editar; null para crear una nueva. */
  entry: GuideEntry | null;
  /** Orden sugerido para una entrada nueva. */
  suggestedSort: number;
  onSaved: (saved: GuideEntry) => void;
  onCancel: () => void;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Formulario para crear o editar una entrada de la guía. */
export default function GuideEditor({ entry, suggestedSort, onSaved, onCancel }: Props) {
  const [slug, setSlug] = useState(entry?.slug ?? '');
  const [category, setCategory] = useState<GuideCategory>(entry?.category ?? GUIDE_CATEGORIES[0].key);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [summary, setSummary] = useState(entry?.summary ?? '');
  const [objective, setObjective] = useState(entry?.objective ?? '');
  const [doText, setDoText] = useState(listToLines(entry?.do_items ?? []));
  const [avoidText, setAvoidText] = useState(listToLines(entry?.avoid_items ?? []));
  const [stepsText, setStepsText] = useState(listToLines(entry?.steps ?? []));
  const [source, setSource] = useState(entry?.source ?? '');
  const [published, setPublished] = useState(entry?.published ?? true);
  const [sort, setSort] = useState(String(entry?.sort ?? suggestedSort));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    const cleanSlug = slug.trim();
    if (!cleanSlug) found.slug = 'Escribe un identificador corto para la entrada.';
    else if (!SLUG_RE.test(cleanSlug)) found.slug = 'Usa solo minúsculas, números y guiones (ej.: agua-diaria).';
    if (!title.trim()) found.title = 'Escribe el título.';
    const sortNumber = Number(sort);
    if (sort.trim() === '' || !Number.isFinite(sortNumber)) found.sort = 'El orden debe ser un número.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: GuideEntryInput = {
      ...(entry ? { id: entry.id } : {}),
      slug: cleanSlug,
      category,
      title: title.trim(),
      summary: summary.trim() || null,
      objective: objective.trim() || null,
      do_items: linesToList(doText),
      avoid_items: linesToList(avoidText),
      steps: linesToList(stepsText),
      source: source.trim() || null,
      published,
      sort: sortNumber,
    };

    setSaving(true);
    setSaveError(null);
    try {
      const saved = await repo.adminSaveGuideEntry(input);
      onSaved(saved);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <h2 className="display text-2xl text-navy-900">{entry ? 'Editar entrada' : 'Nueva entrada'}</h2>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <TextField
          label="Identificador (slug)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={errors.slug}
          placeholder="agua-diaria"
          autoComplete="off"
        />
        <SelectField label="Categoría" value={category} onChange={(e) => setCategory(e.target.value as GuideCategory)}>
          {GUIDE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </SelectField>
        <div className="md:col-span-2">
          <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        </div>
        <div className="md:col-span-2">
          <TextArea label="Resumen" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <TextArea label="Objetivo" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
        </div>
        <TextArea
          label="Sí (una por línea)"
          rows={6}
          value={doText}
          onChange={(e) => setDoText(e.target.value)}
        />
        <TextArea
          label="Evita (una por línea)"
          rows={6}
          value={avoidText}
          onChange={(e) => setAvoidText(e.target.value)}
        />
        <div className="md:col-span-2">
          <TextArea
            label="Pasos (una por línea)"
            rows={5}
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
          />
        </div>
        <TextField label="Fuente" value={source} onChange={(e) => setSource(e.target.value)} />
        <TextField
          label="Orden"
          type="number"
          inputMode="numeric"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          error={errors.sort}
        />
        <label className="flex items-center gap-3 font-semibold text-navy-900 md:col-span-2">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="size-5 accent-brand-blue"
          />
          Publicada (visible para todas las personas)
        </label>
      </div>

      {saveError ? (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700">{saveError}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar entrada'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancelar</Button>
      </div>
    </form>
  );
}
