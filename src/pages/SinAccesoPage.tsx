import { LinkButton } from '../components/ui/Button';

export default function SinAccesoPage() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="eyebrow">Acceso restringido</p>
      <h1 className="display mt-3 text-4xl text-navy-900 md:text-5xl">No tienes acceso a esta sección</h1>
      <p className="mt-4 text-slate-600">Esta parte del sitio es solo para cuentas autorizadas.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton to="/" variant="primary">Ir al inicio</LinkButton>
        <LinkButton to="/perfil" variant="secondary">Mi perfil</LinkButton>
      </div>
    </section>
  );
}
