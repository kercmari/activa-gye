import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Check, MapPin } from 'lucide-react';
import { repo, type NutritionGuide, type Sport } from '../../data';
import { sportIcon } from '../../lib/icons';
import Badge from '../ui/Badge';

interface Props {
  guide: NutritionGuide;
  kind: 'ia' | 'basica';
}

const card = 'rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8';

/** Dibuja la guía nutricional tal cual llega (forma fija de NutritionGuide). */
export default function GuideView({ guide, kind }: Props) {
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await repo.listSports();
        if (alive) setSports(list);
      } catch {
        // Sin nombres de deporte: se muestra un texto genérico, la guía sigue visible.
      }
    })();
    return () => { alive = false; };
  }, []);

  const maxMacro = Math.max(guide.macros.protein_g, guide.macros.carbs_g, guide.macros.fat_g, 1);
  const macros = [
    { label: 'Proteína', grams: guide.macros.protein_g, color: 'bg-brand-blue' },
    { label: 'Carbohidratos', grams: guide.macros.carbs_g, color: 'bg-brand-orange' },
    { label: 'Grasa', grams: guide.macros.fat_g, color: 'bg-navy-900' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {kind === 'basica' ? <Badge tone="slate">Guía básica calculada</Badge> : <Badge tone="blue">Guía con IA</Badge>}
      </div>

      <section className={card} aria-labelledby="guia-resumen">
        <h2 id="guia-resumen" className="display text-2xl text-navy-900">Resumen</h2>
        <p className="mt-3 text-slate-700">{guide.summary}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">IMC</p>
            <p className="display mt-1 text-4xl text-navy-900">{guide.bmi}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{guide.bmi_label}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Energía</p>
            <p className="display mt-1 text-4xl text-navy-900">{guide.daily_kcal}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">kcal al día</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Agua</p>
            <p className="mt-2 text-base font-semibold text-navy-900">{guide.hydration}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-500">Macronutrientes (g al día)</h3>
          <ul className="mt-4 space-y-3">
            {macros.map((m) => (
              <li key={m.label}>
                <div className="flex justify-between text-sm font-semibold text-navy-900">
                  <span>{m.label}</span>
                  <span>{m.grams} g</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: `${Math.round((m.grams / maxMacro) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {guide.warnings.length > 0 ? (
        <section className="rounded-[1.75rem] border border-amber-300 bg-amber-50 p-6 md:p-8" aria-labelledby="guia-advertencias">
          <h2 id="guia-advertencias" className="flex items-center gap-2 text-lg font-extrabold text-amber-900">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" /> Ten en cuenta
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-amber-900">
            {guide.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </section>
      ) : null}

      <section className={card} aria-labelledby="guia-recomendaciones">
        <h2 id="guia-recomendaciones" className="display text-2xl text-navy-900">Recomendaciones</h2>
        <ul className="mt-4 space-y-3">
          {guide.recommendations.map((r) => (
            <li key={r} className="flex gap-3 text-slate-700">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" aria-hidden="true" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="guia-dia">
        <h2 id="guia-dia" className="display text-2xl text-navy-900">Ejemplo de un día</h2>
        <ol className="mt-4 space-y-4">
          {guide.sample_day.map((comida) => (
            <li key={comida.meal} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-extrabold text-navy-900">{comida.meal}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {comida.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className={card} aria-labelledby="guia-actividad">
        <h2 id="guia-actividad" className="display text-2xl text-navy-900">Actividad sugerida</h2>
        <ul className="mt-4 space-y-4">
          {guide.activity.map((a) => {
            const sport = sports.find((s) => s.id === a.sport_id);
            const Icon = sportIcon(sport?.icon ?? '');
            return (
              <li key={a.sport_id} className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-extrabold text-navy-900">{sport?.name ?? 'Deporte sugerido'}</p>
                    <p className="text-sm font-semibold text-slate-600">{a.per_week}</p>
                    <p className="mt-1 text-sm text-slate-600">{a.reason}</p>
                  </div>
                </div>
                <Link
                  to={`/lugares?deporte=${encodeURIComponent(a.sport_id)}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-blue-dark"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" /> Ver lugares
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600">
        {guide.disclaimer}
      </p>
    </div>
  );
}
