import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Tarjeta blanca centrada sobre fondo azul marino, con el logo. Para ingresar, registro y recuperar. */
export default function AuthShell({ title, subtitle, children }: Props) {
  return (
    <section className="bg-navy-900 px-4 py-12 md:py-20">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3" aria-label="Activa GYE, ir al inicio">
          <img src="/img/logo.png" alt="" className="h-12 w-auto rounded-lg bg-white p-0.5" />
          <span className="text-2xl font-extrabold italic tracking-tight text-white">
            ACTIVA <span className="text-brand-blue">GYE</span>
          </span>
        </Link>
        <div className="rounded-[1.75rem] bg-white p-8 shadow-xl shadow-navy-900/5 md:p-10">
          <h1 className="display text-3xl text-navy-900">{title}</h1>
          {subtitle ? <p className="mt-3 text-slate-600">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}
