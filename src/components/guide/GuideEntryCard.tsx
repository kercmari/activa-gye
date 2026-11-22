import { createElement } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { GuideEntry } from '../../data';
import { CATEGORY_LABELS, categoryIcon } from './guideModel';

function CategoryGlyph({ category }: { category: GuideEntry['category'] }) {
  return createElement(categoryIcon(category), { className: 'size-6', 'aria-hidden': true });
}

/** Tarjeta de una entrada de la guía: objetivo, Sí, Evita, pasos y fuente. */
export default function GuideEntryCard({ entry }: { entry: GuideEntry }) {
  return (
    <article className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-brand-blue">
          <CategoryGlyph category={entry.category} />
        </span>
        <div className="min-w-0">
          <p className="eyebrow !text-brand-blue">{CATEGORY_LABELS[entry.category]}</p>
          <h2 className="display mt-1 text-2xl text-navy-900 md:text-3xl">{entry.title}</h2>
          {entry.summary ? <p className="mt-2 text-slate-600">{entry.summary}</p> : null}
        </div>
      </header>

      {entry.objective ? (
        <section className="mt-6">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-500">Objetivo</h3>
          <p className="mt-2 text-navy-900">{entry.objective}</p>
        </section>
      ) : null}

      {entry.do_items.length > 0 ? (
        <section aria-labelledby={`si-${entry.id}`} className="mt-6 rounded-2xl bg-emerald-50 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-700" aria-hidden="true" />
            <h3 id={`si-${entry.id}`} className="font-extrabold text-emerald-800">Sí</h3>
            <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-white">SÍ</span>
          </div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-emerald-950">
            {entry.do_items.map((item, i) => <li key={`${i}-${item}`}>{item}</li>)}
          </ul>
        </section>
      ) : null}

      {entry.avoid_items.length > 0 ? (
        <section aria-labelledby={`evita-${entry.id}`} className="mt-4 rounded-2xl bg-red-50 p-5">
          <div className="flex items-center gap-2">
            <XCircle className="size-5 text-red-700" aria-hidden="true" />
            <h3 id={`evita-${entry.id}`} className="font-extrabold text-red-800">Evita</h3>
            <span className="rounded-full bg-red-700 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-white">EVITA</span>
          </div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-red-950">
            {entry.avoid_items.map((item, i) => <li key={`${i}-${item}`}>{item}</li>)}
          </ul>
        </section>
      ) : null}

      {entry.steps.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-500">Pasos</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-navy-900">
            {entry.steps.map((step, i) => <li key={`${i}-${step}`}>{step}</li>)}
          </ol>
        </section>
      ) : null}

      {entry.source ? (
        <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span className="font-bold text-slate-600">Fuente:</span> {entry.source}
        </p>
      ) : null}
    </article>
  );
}
