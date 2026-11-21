import { ArrowRight, Bike, Compass, Heart, Route, Scale, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import PageHeader from '../components/ui/PageHeader';
import { LinkButton } from '../components/ui/Button';

const STEPS = [
  { icon: Search, title: 'Busca', text: 'Filtra por deporte, zona, precio, horario o servicios.' },
  { icon: Scale, title: 'Compara', text: 'Mira horarios, precios y servicios de cada lugar, lado a lado.' },
  { icon: Route, title: 'Ve', text: 'Abre la ficha y usa "Cómo llegar" para ir sin perderte.' },
];

export default function ConocenosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Conócenos"
        title="Hacemos fácil empezar a moverte"
        subtitle="Activa GYE reúne en un solo lugar los sitios donde practicar deporte en Guayaquil."
      />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16">
        <section className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow">Qué es</p>
            <h2 className="display mt-2 text-3xl text-navy-900 md:text-4xl">Tu guía deportiva en Guayaquil</h2>
            <p className="mt-4 text-slate-600">
              Es una web para descubrir gimnasios, centros deportivos y actividades físicas en la ciudad. Puedes
              buscar por lo que te interesa, comparar opciones y llegar al lugar elegido.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white p-8 shadow-xl shadow-navy-900/5">
            <p className="eyebrow">Nuestra misión</p>
            <p className="display mt-3 text-2xl text-navy-900">
              Que cualquier persona en Guayaquil encuentre un lugar para moverse, sin complicaciones.
            </p>
          </div>
        </section>

        <section>
          <p className="eyebrow">Cómo funciona</p>
          <h2 className="display mt-2 text-3xl text-navy-900 md:text-4xl">Tres pasos</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-[1.75rem] bg-white p-7 shadow-xl shadow-navy-900/5">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-brand-blue">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="display text-3xl text-slate-200">0{i + 1}</span>
                </div>
                <h3 className="display mt-5 text-xl text-navy-900">{title}</h3>
                <p className="mt-2 text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[1.75rem] bg-navy-900 p-8 text-white">
            <UserRound className="h-8 w-8 text-brand-orange" aria-hidden="true" />
            <h2 className="display mt-4 text-2xl text-white">Tu cuenta</h2>
            <p className="mt-3 text-slate-300">
              Con una cuenta puedes guardar tus lugares favoritos, registrar tu progreso y tener tu plan.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-brand-blue p-8 text-white">
            <Heart className="h-8 w-8 text-white" aria-hidden="true" />
            <h2 className="display mt-4 text-2xl text-white">Nutricionista</h2>
            <p className="mt-3 text-white/90">
              Si quieres orientación sobre tu alimentación, puedes pedir una guía y un nutricionista puede revisar tu caso.
            </p>
            <Link to="/nutricion" className="mt-5 inline-flex items-center gap-2 font-bold text-white underline-offset-4 hover:underline">
              Conoce el servicio <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Compass className="h-4 w-4" aria-hidden="true" />
          Proyecto académico desarrollado en Guayaquil, 2026.
        </p>

        <div className="flex flex-wrap gap-3">
          <LinkButton to="/lugares" variant="primary" size="lg" iconRight={Bike}>Buscar lugares</LinkButton>
          <LinkButton to="/registro" variant="secondary" size="lg">Crear mi cuenta</LinkButton>
        </div>
      </div>
    </>
  );
}
