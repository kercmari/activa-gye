/** Pestaña «Mi ficha»: carga la ficha (cargando / error / formulario) y muestra el estado inicial. */
import { useState } from 'react';
import { repo, type PatientIntake } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../profile/useAsync';
import { ErrorState, Loading } from '../ui/States';
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
      {current ? <EstadoInicial intake={current} profile={session.profile} /> : null}
    </div>
  );
}
