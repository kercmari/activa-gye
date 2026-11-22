import { useState, type FormEvent } from 'react';
import { repo, type CareRequest, type Followup, type NutritionistPublic } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../profile/useAsync';
import ConfirmDialog from '../profile/ConfirmDialog';
import { formatDateLong } from '../profile/labels';
import { Button, LinkButton } from '../ui/Button';
import { TextArea } from '../ui/Field';
import { ErrorState, Loading, errorMessage } from '../ui/States';

const MENSAJE_MAX = 500;

/** Fecha corta del timestamp ISO (AAAA-MM-DD…) para formatDateLong. */
function dia(iso: string): string {
  return formatDateLong(iso.slice(0, 10));
}

/** Pestaña «Mi nutricionista»: pedir, ver el estado, seguimientos y cancelar. */
export default function Tab() {
  const care = useAsync(() => repo.getMyCareRequest());

  if (care.status === 'loading') return <Loading text="Cargando tu solicitud…" />;
  if (care.status === 'error') return <ErrorState message={care.message} onRetry={care.reload} />;

  const request = care.data;
  if (!request) return <SinSolicitud onChanged={care.reload} />;
  if (request.status === 'abierta') return <Abierta request={request} onChanged={care.reload} />;
  return <Aceptada request={request} onChanged={care.reload} />;
}

/* ---------------------------------------------------------------- sin solicitud */

function SinSolicitud({ onChanged }: { onChanged: () => void }) {
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinFicha, setSinFicha] = useState(false);

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setSinFicha(false);
    try {
      const texto = mensaje.trim();
      await repo.requestCare(texto ? texto : null);
      onChanged();
    } catch (e) {
      if ((e as { code?: unknown } | null)?.code === 'FALTA_FICHA') setSinFicha(true);
      else setError(errorMessage(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <h2 className="display text-2xl text-navy-900">Pide un nutricionista</h2>
      <p className="mt-3 text-slate-600">Pide un nutricionista: verá tu ficha y te armará un calendario.</p>

      <form onSubmit={enviar} className="mt-6 space-y-5" noValidate>
        <TextArea
          label="Mensaje para el nutricionista (opcional)"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          maxLength={MENSAJE_MAX}
          rows={4}
          hint={`${mensaje.length}/${MENSAJE_MAX}`}
        />

        {sinFicha ? (
          <div role="alert" className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="font-bold text-navy-900">Primero llena tu ficha</p>
            <p className="mt-1 text-sm text-slate-600">El nutricionista necesita tus datos para atenderte.</p>
            <LinkButton to="/mi-panel?tab=ficha" variant="secondary" size="md" className="mt-4">
              Abrir mi ficha
            </LinkButton>
          </div>
        ) : null}
        {error ? <p role="alert" className="font-bold text-red-700">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Solicitar nutricionista'}
          </Button>
        </div>
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------- solicitud abierta */

function Abierta({ request, onChanged }: { request: CareRequest; onChanged: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelar = async () => {
    setBusy(true);
    setError(null);
    try {
      await repo.cancelMyCareRequest(request.id);
      setConfirmando(false);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
      setConfirmando(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <p className="eyebrow text-brand-orange">Solicitud enviada</p>
      <h2 className="display mt-2 text-2xl text-navy-900">Tu solicitud está esperando a un nutricionista</h2>
      <p className="mt-2 text-slate-600">Enviada el {dia(request.created_at)}.</p>
      {request.message ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{request.message}</p> : null}

      {error ? <p role="alert" className="mt-4 font-bold text-red-700">{error}</p> : null}

      <div className="mt-6">
        <Button variant="danger" onClick={() => setConfirmando(true)} disabled={busy}>
          Cancelar solicitud
        </Button>
      </div>

      {confirmando ? (
        <ConfirmDialog
          title="¿Cancelar la solicitud?"
          text="Ningún nutricionista verá tu solicitud. Puedes volver a pedir uno cuando quieras."
          confirmLabel="Sí, cancelar"
          busy={busy}
          onConfirm={cancelar}
          onCancel={() => setConfirmando(false)}
        />
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- solicitud aceptada */

function Aceptada({ request, onChanged }: { request: CareRequest; onChanged: () => void }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? request.patient_id;
  const nutri = useAsync(() => repo.getMyNutritionist());
  const seguimientos = useAsync(() => repo.listFollowups(userId), [userId]);
  const [confirmando, setConfirmando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelar = async () => {
    setBusy(true);
    setError(null);
    try {
      await repo.cancelMyCareRequest(request.id);
      setConfirmando(false);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
      setConfirmando(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <p className="eyebrow text-brand-orange">Atención activa</p>
        {nutri.status === 'loading' ? <Loading text="Cargando a tu nutricionista…" /> : null}
        {nutri.status === 'error' ? <ErrorState message={nutri.message} onRetry={nutri.reload} /> : null}
        {nutri.status === 'ok' && nutri.data ? <TarjetaNutricionista nutri={nutri.data} aceptadaEl={request.accepted_at} /> : null}
        {nutri.status === 'ok' && !nutri.data ? (
          <ErrorState message="No encontramos a tu nutricionista. Vuelve a intentarlo." onRetry={nutri.reload} />
        ) : null}

        {error ? <p role="alert" className="mt-4 font-bold text-red-700">{error}</p> : null}
        <div className="mt-6">
          <Button variant="danger" onClick={() => setConfirmando(true)} disabled={busy}>
            Cancelar atención
          </Button>
        </div>

        {confirmando ? (
          <ConfirmDialog
            title="¿Cancelar la atención?"
            text="Tu nutricionista dejará de acompañarte. Podrás pedir otro cuando quieras."
            confirmLabel="Sí, cancelar"
            busy={busy}
            onConfirm={cancelar}
            onCancel={() => setConfirmando(false)}
          />
        ) : null}
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8" aria-labelledby="seguimientos-titulo">
        <h2 id="seguimientos-titulo" className="display text-2xl text-navy-900">Seguimientos</h2>
        <div className="mt-6">
          {seguimientos.status === 'loading' ? <Loading text="Cargando seguimientos…" /> : null}
          {seguimientos.status === 'error' ? <ErrorState message={seguimientos.message} onRetry={seguimientos.reload} /> : null}
          {seguimientos.status === 'ok' && seguimientos.data.length === 0 ? (
            <p className="text-slate-600">Tu nutricionista aún no registra seguimientos.</p>
          ) : null}
          {seguimientos.status === 'ok' && seguimientos.data.length > 0 ? (
            <ul className="space-y-4">
              {seguimientos.data.map((f) => <FilaSeguimiento key={f.id} f={f} />)}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TarjetaNutricionista({ nutri, aceptadaEl }: { nutri: NutritionistPublic; aceptadaEl: string | null }) {
  const { average, count } = nutri.rating;
  return (
    <div className="mt-2">
      <h2 className="display text-2xl text-navy-900">{nutri.full_name}</h2>
      {count > 0 && average !== null ? (
        <p className="mt-1 text-sm font-bold text-slate-600">★ {average.toFixed(1).replace('.', ',')} ({count})</p>
      ) : null}
      {aceptadaEl ? <p className="mt-3 text-slate-600">Te atiende desde {dia(aceptadaEl)}.</p> : null}
    </div>
  );
}

function FilaSeguimiento({ f }: { f: Followup }) {
  return (
    <li className="rounded-2xl bg-slate-50 p-5">
      <p className="font-extrabold text-navy-900">{dia(f.followup_date)}</p>
      {f.weight_kg !== null ? <p className="mt-1 text-sm text-slate-600">Peso: {f.weight_kg.toFixed(1).replace('.', ',')} kg</p> : null}
      <p className="mt-3 text-slate-700"><span className="font-bold">Observaciones:</span> {f.observations}</p>
      <p className="mt-2 text-slate-700"><span className="font-bold">Recomendaciones:</span> {f.recommendations}</p>
    </li>
  );
}
