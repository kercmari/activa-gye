import type { ReactNode } from 'react';
import BackButton from './BackButton';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Ruta de "Volver" si no hay historial. `false` oculta el botón. Por defecto '/'. */
  back?: string | false;
  children?: ReactNode;
}

/** Franja azul marino de cabecera de página interna. */
export default function PageHeader({ eyebrow, title, subtitle, back, children }: Props) {
  return (
    <section className="bg-navy-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        {back !== false ? (
          <BackButton fallback={back ?? '/'} className="-ml-2 mb-6 text-white hover:bg-white/10" />
        ) : null}
        {eyebrow ? <p className="eyebrow !text-brand-blue">{eyebrow}</p> : null}
        <h1 className="display mt-3 text-4xl text-white md:text-6xl">{title}</h1>
        {subtitle ? <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">{subtitle}</p> : null}
        {children}
      </div>
    </section>
  );
}
