/** Marcador temporal: la tarea dueña de la página lo reemplaza. Debe desaparecer antes de la entrega. */
import { Link } from 'react-router';
export default function Pending({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <h1 className="text-3xl font-extrabold text-navy-900">{title}</h1>
      <p className="mt-3 text-slate-600">Página en construcción.</p>
      <Link to="/" className="mt-6 inline-block font-bold text-brand-orange">← Ir al inicio</Link>
    </section>
  );
}
