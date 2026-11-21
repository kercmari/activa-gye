import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';

const linkClass = 'text-sm text-slate-300 transition-colors hover:text-white';

export function Footer() {
  const { session } = useAuth();
  return (
    <footer className="bg-navy-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-3" aria-label="Activa GYE, ir al inicio">
            <img src="/img/logo.png" alt="" className="h-11 w-auto" />
            <span className="text-xl font-extrabold italic tracking-tight">
              ACTIVA <span className="text-brand-blue">GYE</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-slate-300">Tu guía deportiva en Guayaquil.</p>
        </div>

        <div>
          <h2 className="eyebrow !text-brand-blue">Explora</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            <li><Link to="/deportes" className={linkClass}>Deportes</Link></li>
            <li><Link to="/lugares" className={linkClass}>Buscar lugares</Link></li>
            <li><Link to="/nutricion" className={linkClass}>Nutricionista</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow !text-brand-blue">Tu cuenta</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {session ? (
              <li><Link to="/perfil" className={linkClass}>Mi perfil</Link></li>
            ) : (
              <li><Link to="/ingresar" className={linkClass}>Ingresar</Link></li>
            )}
            {session ? null : <li><Link to="/registro" className={linkClass}>Crear cuenta</Link></li>}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow !text-brand-blue">Activa GYE</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            <li><Link to="/conocenos" className={linkClass}>Conócenos</Link></li>
            <li><Link to="/contacto" className={linkClass}>Contacto</Link></li>
            <li><Link to="/privacidad" className={linkClass}>Privacidad y términos</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-400">
          © 2026 Activa GYE · Guayaquil, Ecuador · Proyecto académico
        </p>
      </div>
    </footer>
  );
}

export default Footer;
