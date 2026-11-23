import { ArrowRight, ClipboardList, Flame, UserCheck } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { usePhase } from '../auth/SettingsContext';
import { LinkButton } from '../components/ui/Button';

/** Portada (inicio `/`): Nutrición. Con la fase 2 apagada solo aparece el paso de la ficha, sin «Próximamente». */
export default function HomePage() {
  const { session } = useAuth();
  const phase2 = usePhase(2);

  const steps = [
    { icon: ClipboardList, title: 'Llena tu ficha', text: 'Registra tus datos y una foto de referencia.' },
    ...(phase2
      ? [
          { icon: UserCheck, title: 'Un nutricionista acepta tu solicitud', text: 'Un profesional revisa tu ficha y te acompaña desde ese momento.' },
          { icon: Flame, title: 'Sigue tu calendario', text: 'Marca cada día cumplido y revisa tu avance con tu nutricionista.' },
        ]
      : []),
  ];

  return (
    <>
      {/* a. Portada con foto */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <img src="/img/hero.jpg" alt="" className="absolute inset-y-0 right-0 h-full w-full object-cover object-[70%_center] opacity-40 md:w-3/5 md:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/80 to-navy-900/10 md:via-navy-900/60" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 md:pb-28 md:pt-24">
          <p className="eyebrow !text-brand-blue">Nutrición</p>
          <h1 className="display mt-3 max-w-3xl text-5xl text-white md:text-7xl">Acompañamiento nutricional</h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Activa GYE conecta pacientes con nutricionistas. Recibe comidas y rutinas según tu peso, edad y objetivo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {session ? (
              <LinkButton to="/mi-panel" variant="primary" size="lg" iconRight={ArrowRight}>Ir a mi ficha</LinkButton>
            ) : (
              <>
                <LinkButton to="/registro?tipo=paciente" variant="primary" size="lg" iconRight={ArrowRight}>Soy paciente</LinkButton>
                <LinkButton to="/registro?tipo=nutricionista" variant="secondary" size="lg" onDark>Soy nutricionista</LinkButton>
              </>
            )}
          </div>
        </div>
      </section>

      {/* b. Cómo funciona */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="display text-3xl text-navy-900">Cómo funciona</h2>
        <ol className={`mt-8 grid gap-6 ${steps.length > 1 ? 'md:grid-cols-3' : ''}`}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-brand-blue">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="eyebrow text-slate-500">Paso {index + 1}</span>
                </div>
                <h3 className="display mt-5 text-xl text-navy-900">{step.title}</h3>
                <p className="mt-2 text-slate-600">{step.text}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex flex-col gap-4 rounded-[1.75rem] bg-white p-8 shadow-xl shadow-navy-900/5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow text-brand-orange">Semana gratis</p>
            <h2 className="display mt-2 text-2xl text-navy-900">Empieza tu semana gratis</h2>
            <p className="mt-2 max-w-xl text-slate-600">
              7 días de comidas y rutinas armados por nutricionistas según tu peso, edad y objetivo.
            </p>
          </div>
          {session ? (
            <LinkButton to="/mi-plan/hoy" variant="primary" size="lg">Ir a mi semana gratis</LinkButton>
          ) : (
            <LinkButton to="/registro?tipo=paciente" variant="primary" size="lg">Empezar mi semana gratis</LinkButton>
          )}
        </div>

        <div className="mt-12 rounded-[1.75rem] bg-navy-900 p-8 text-white shadow-xl shadow-navy-900/10">
          <h2 className="display text-2xl text-white">Para nutricionistas</h2>
          <p className="mt-3 text-slate-200">Atiende pacientes desde tu panel. Tu cuenta se revisa antes de activarse.</p>
          <Link to="/contacto" className="mt-5 inline-block font-bold text-brand-orange hover:underline">
            Escríbenos para contratar
          </Link>
        </div>

        <p role="note" className="mt-10 rounded-2xl bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">
          Activa GYE conecta pacientes con nutricionistas. No da diagnósticos ni consejos automáticos.
        </p>
      </section>
    </>
  );
}
