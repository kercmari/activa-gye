/** Muro de los días 8+ sin suscripción activa. Con la fase 2 apagada solo dice «Próximamente». */
import { Lock } from 'lucide-react';
import { LinkButton } from '../ui/Button';

export default function Paywall({ phase2On }: { phase2On: boolean }) {
  if (!phase2On) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-slate-100 p-5 text-slate-700" data-testid="paywall-proximamente">
        <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p><strong className="text-navy-900">Próximamente.</strong> La agenda pagada se habilitará en la siguiente etapa de Activa GYE.</p>
      </div>
    );
  }
  return (
    <div className="rounded-[1.75rem] bg-navy-900 p-6 text-white" data-testid="paywall">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="display mt-4 text-2xl text-white">Tu semana gratis termina en el Día 7.</h3>
      <p className="mt-2 text-slate-300">Suscríbete para que una nutricionista siga tu plan.</p>
      <div className="mt-6">
        <LinkButton to="/mi-plan/suscripcion" variant="primary">Suscribirme</LinkButton>
      </div>
    </div>
  );
}
