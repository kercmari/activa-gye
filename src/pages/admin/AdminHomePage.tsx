import { Link } from 'react-router';
import AdminShell from '../../components/admin/AdminShell';
import { useSettings, usePhase } from '../../auth/SettingsContext';
import { usePendingCount } from '../../components/admin/usePendingCount';

interface Tarjeta {
  to: string;
  titulo: string;
  texto: string;
  /** Fase que debe estar encendida para que la tarjeta aparezca. */
  phase?: 2 | 3;
  /** Muestra cuántas solicitudes de suscripción esperan aprobación. */
  pendientes?: boolean;
}

const TARJETAS: Tarjeta[] = [
  { to: '/admin/lugares', titulo: 'Lugares', texto: 'Crea, edita y revisa los lugares deportivos de Guayaquil.' },
  { to: '/admin/plantillas', titulo: 'Plantillas', texto: 'Crea y revisa las plantillas de comidas y rutinas que reciben los pacientes.' },
  { to: '/admin/guia', titulo: 'Guía', texto: 'Escribe y actualiza las entradas de la guía pública.' },
  { to: '/admin/datos-lugares', titulo: 'Datos de lugares', texto: 'Completa horarios, precios y datos de cada lugar.', phase: 3 },
  { to: '/admin/suscripciones', titulo: 'Suscripciones', texto: 'Aprueba o rechaza las solicitudes que llegan por correo y revisa las suscripciones activas.', pendientes: true },
  { to: '/admin/planes', titulo: 'Planes y correo', texto: 'Edita los precios y límites de los planes, el plan gratis y el correo de la administración.' },
  { to: '/admin/usuarios', titulo: 'Usuarios', texto: 'Consulta las cuentas registradas y sus roles.' },
  { to: '/admin/mensajes', titulo: 'Mensajes', texto: 'Lee los mensajes enviados desde el formulario de contacto.' },
  { to: '/nutri', titulo: 'Panel nutricionista', texto: 'Abre el panel de nutricionista: solicitudes, pacientes y seguimiento.', phase: 2 },
];

/** Marca de fase: ✓ encendida, ✗ apagada. */
function marca(encendida: boolean): string {
  return encendida ? '✓' : '✗';
}

/** Resumen del panel de administración: enlaces a cada sección. */
export default function AdminHomePage() {
  const { settings } = useSettings();
  const estadoFases = `Fase 1 ${marca(settings.phase1)} · Fase 2 ${marca(settings.phase2)} · Fase 3 ${marca(settings.phase3)}`;
  const phase2 = usePhase(2);
  const phase3 = usePhase(3);
  // Las tarjetas de una fase apagada no se muestran.
  const tarjetas = TARJETAS.filter((t) => (t.phase === 2 ? phase2 : t.phase === 3 ? phase3 : true));
  // Suscripciones y Planes y correo se ven siempre, aunque la fase 2 esté apagada.
  const pendientes = usePendingCount(true);

  return (
    <AdminShell title="Administración">
      <ul aria-label="Secciones de administración" className="grid gap-5 sm:grid-cols-2">
        <li>
          <article className="h-full rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
            <h2 className="display text-2xl text-navy-900">
              <Link to="/admin/fases" className="hover:text-brand-orange">Fases</Link>
            </h2>
            <p className="mt-2 text-slate-600">Enciende o apaga cada fase de la plataforma y el cupo de pacientes.</p>
            <p className="mt-4 text-sm font-bold text-navy-900">{estadoFases}</p>
          </article>
        </li>
        {tarjetas.map((t) => (
          <li key={t.to}>
            <article className="h-full rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
              <h2 className="display text-2xl text-navy-900">
                <Link to={t.to} className="hover:text-brand-orange">{t.titulo}</Link>
              </h2>
              <p className="mt-2 text-slate-600">{t.texto}</p>
              {t.pendientes && pendientes ? (
                <p className="mt-4 text-sm font-bold text-brand-orange">{pendientes} {pendientes === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}</p>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
