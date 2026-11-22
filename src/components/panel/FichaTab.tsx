/** Pestaña «Mi ficha»: carga la ficha (cargando / error / formulario) y muestra el estado inicial. */
import { useState } from 'react';
import { repo, type PatientIntake } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../profile/useAsync';
import { ErrorState, Loading } from '../ui/States';
import { LinkButton } from '../ui/Button';
import FichaForm from './FichaForm';
import EstadoInicial from './EstadoInicial';

export default function FichaTab() {
  const { session, refresh } = useAuth();
  const intake = useAsync(() => repo.getMyIntake(), []);
  // Ficha recién guardada: reemplaza la cargada sin volver a mostrar «Cargando».
  const [saved, setSaved] = useState<PatientIntake | null>(null);

  if (!session) return null;

  if (intake.status === 'loading') return <Loading text="Cargando tu ficha…" />;
  if (intake.status === 'error') return <ErrorState message={intake.message} onRetry={intake.reload} />;

  const current = saved ?? intake.data;

  return (
    <div className="space-y-8">
      <FichaForm
        intake={current}
        profile={session.profile}
        userId={session.user.id}
        refresh={refresh}
        onSaved={setSaved}
      />
      {saved ? (
        <div className="rounded-[1.75rem] bg-navy-900 p-6 text-white shadow-xl shadow-navy-900/5 md:flex md:items-center md:justify-between md:gap-6 md:p-8">
          <p className="font-semibold">Tu ficha está lista. Empieza tu semana gratis cuando quieras.</p>
          <div className="mt-4 md:mt-0">
            <LinkButton to="/mi-plan/hoy" variant="primary" size="lg">Ver mi semana gratis</LinkButton>
          </div>
        </div>
      ) : null}
      {current ? <EstadoInicial intake={current} profile={session.profile} /> : null}
    </div>
  );
}
