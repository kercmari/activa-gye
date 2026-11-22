/** Tarjeta «Tu estado inicial»: IMC y estimación básica (sin IA) a partir de la ficha guardada. */
import type { PatientIntake, Profile } from '../../data';
import { buildBasicGuide } from '../../lib/nutrition/guide';
import { ageFromBirth } from '../nutrition/labels';
import { imc } from './ficha';

interface Props {
  intake: PatientIntake;
  profile: Profile;
}

export default function EstadoInicial({ intake, profile }: Props) {
  const { value: bmi, label: bmiLabel } = imc(intake.weight_kg, intake.height_cm);
  const age = ageFromBirth(profile.birth_date);
  const { sex } = profile;
  const { goal, activity_level: activity } = intake;
  const guide = age !== null && sex && goal && activity
    ? buildBasicGuide({
      age,
      sex,
      height_cm: intake.height_cm,
      weight_kg: intake.weight_kg,
      activity_level: activity,
      goal,
      restrictions: null,
      health_conditions: intake.health_notes,
    })
    : null;

  return (
    <section aria-labelledby="estado-inicial" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <p className="eyebrow text-brand-orange">Resumen</p>
      <h2 id="estado-inicial" className="display mt-2 text-2xl text-navy-900">Tu estado inicial</h2>

      <dl className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <dt className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Índice de masa corporal (IMC)</dt>
          <dd className="mt-2 text-lg font-bold text-navy-900">{bmi.toFixed(1)} · {bmiLabel}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Necesidades diarias</dt>
          <dd className="mt-2 text-lg font-bold text-navy-900">
            {guide
              ? `Estimación orientativa: ~${guide.daily_kcal} kcal/día`
              : 'Elige objetivo y nivel de actividad, y completa tu fecha de nacimiento y género, para ver una estimación.'}
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-sm text-slate-600">Es una estimación automática; tu nutricionista te dará tu plan.</p>
    </section>
  );
}
