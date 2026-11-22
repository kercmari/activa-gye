import { Link } from 'react-router';
import { ClipboardList, Flame, UserCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { usePhase } from '../auth/SettingsContext';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import { LinkButton } from '../components/ui/Button';

/** Cómo funciona: pasos del servicio de nutrición y acceso a la ficha o al registro. */
export default function NutricionPage() {
  const { session } = useAuth();
  const phase2 = usePhase(2);

  const steps = [
    { icon: ClipboardList, title: 'Llena tu ficha', text: 'Registra tus datos y una foto de referencia.', soon: false },
    { icon: UserCheck, title: 'Un nutricionista acepta tu solicitud', text: 'Un profesional revisa tu ficha y te acompaña desde ese momento.', soon: !phase2 },
    { icon: Flame, title: 'Sigue tu calendario', text: 'Marca cada día cumplido y revisa tu avance con tu nutricionista.', soon: !phase2 },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Nutrición"
        title="Acompañamiento nutricional"
        subtitle="Activa GYE conecta pacientes con nutricionistas."
        back="/"
      />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="display text-3xl text-navy-900">Cómo funciona</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
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
                {step.soon ? <Badge tone="slate" className="mt-4">Próximamente</Badge> : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {session ? (
            <LinkButton to="/mi-panel" variant="primary" size="lg">Ir a mi ficha</LinkButton>
          ) : (
            <>
              <LinkButton to="/registro" variant="primary" size="lg">Crear mi cuenta</LinkButton>
              <LinkButton to="/ingresar?volver=/mi-panel" variant="secondary" size="lg">Ya tengo cuenta</LinkButton>
            </>
          )}
        </div>

        <div className="mt-12 rounded-[1.75rem] bg-navy-900 p-8 text-white shadow-xl shadow-navy-900/10">
          <h2 className="display text-2xl text-white">Para nutricionistas</h2>
          <p className="mt-3 text-slate-200">Atiende pacientes desde tu panel. Suscripción mensual.</p>
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
