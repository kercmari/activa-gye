import { Search } from 'lucide-react';
import { LinkButton } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="display mt-3 text-4xl text-navy-900 md:text-5xl">No encontramos esta página</h1>
      <p className="mt-4 text-slate-600">Puede que el enlace esté roto o que la página ya no exista.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton to="/" variant="primary">Ir al inicio</LinkButton>
        <LinkButton to="/lugares" variant="secondary" iconRight={Search}>Buscar lugares</LinkButton>
      </div>
    </section>
  );
}
