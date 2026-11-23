import { useCallback, useEffect, useState } from 'react';
import { Check, Circle, Lock } from 'lucide-react';
import { repo, type DailyCheckin, type Trial } from '../../data';
import { usePhase } from '../../auth/SettingsContext';
import { CheckinCard } from '../../components/plan/CheckinCard';
import { TrialItemRow } from '../../components/plan/TrialItemRow';
import { useTrial } from '../../components/plan/useTrial';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

/** Código de error de la base (AppError.code), o null. */
function codigoDe(e: unknown): string | null {
  if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string') {
    return (e as { code: string }).code;
  }
  return null;
}

/** Mensaje claro para los errores de la semana gratis; si no es uno conocido, el mensaje general. */
function mensajeSemana(e: unknown): string {
  switch (codigoDe(e)) {
    case 'REQUIERE_NUTRICIONISTA':
      return 'Tu ficha tiene condiciones de salud, así que no recibes un plan automático. Pide atención directa a una nutricionista.';
    case 'SIN_PLANTILLA':
      return 'Todavía no hay un plan para tu perfil. Vuelve a intentarlo más tarde.';
    case 'FALTA_FICHA':
      return 'Primero llena tu ficha para generar tu semana gratis.';
    case 'FASE_NO_ACTIVA':
      return 'La semana gratis todavía no está disponible.';
    default:
      return errorMessage(e);
  }
}

/** «martes 24 de noviembre», a partir de 'AAAA-MM-DD' sin depender de la zona horaria. */
function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Hoy (Hoy de Mi plan): semana gratis, ítems del día, chequeo y qué falta para abrir el siguiente día. */
export default function HoyPage() {
  const semana = useTrial();
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  const cargarChequeo = useCallback(async () => {
    setCheckinError(null);
    try {
      setCheckin(await repo.getTodayCheckin());
    } catch (e) {
      setCheckinError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void cargarChequeo();
  }, [cargarChequeo]);

  if (semana.loading && !semana.trial) return <Loading text="Cargando tu semana…" />;

  if (!semana.trial) {
    if (semana.error) return <ErrorState message={semana.error} onRetry={() => void semana.reload()} />;
    return <SinSemana onCreated={() => void semana.reload()} />;
  }

  return (
    <div className="space-y-6">
      {semana.error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-bold text-red-700">{semana.error}</p>
          <Button variant="danger" size="md" onClick={() => void semana.reload()}>Reintentar</Button>
        </div>
      ) : null}
      <SemanaActiva
        trial={semana.trial}
        checkin={checkin}
        checkinError={checkinError}
        onReintentarChequeo={() => void cargarChequeo()}
        onCheckinSaved={(saved) => {
          setCheckin(saved);
          void semana.reload();
        }}
        onToggle={semana.setItemDone}
      />
    </div>
  );
}

interface SinSemanaProps {
  onCreated: () => void;
}

/** Sin semana: ficha pendiente, o botón para generarla, o aviso de nutricionista. */
function SinSemana({ onCreated }: SinSemanaProps) {
  const [ficha, setFicha] = useState<{ estado: 'cargando' } | { estado: 'error'; mensaje: string } | { estado: 'lista'; tiene: boolean }>({
    estado: 'cargando',
  });
  const [intento, setIntento] = useState(0);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<{ codigo: string | null; mensaje: string } | null>(null);

  useEffect(() => {
    let vigente = true;
    repo
      .getMyIntake()
      .then((intake) => {
        if (vigente) setFicha({ estado: 'lista', tiene: intake !== null });
      })
      .catch((e: unknown) => {
        if (vigente) setFicha({ estado: 'error', mensaje: errorMessage(e) });
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const generar = async () => {
    setCreando(true);
    setError(null);
    try {
      await repo.startMyTrial();
      onCreated();
    } catch (e) {
      setError({ codigo: codigoDe(e), mensaje: mensajeSemana(e) });
    } finally {
      setCreando(false);
    }
  };

  if (ficha.estado === 'cargando') return <Loading text="Revisando tu ficha…" />;
  if (ficha.estado === 'error') {
    return <ErrorState message={ficha.mensaje} onRetry={() => { setFicha({ estado: 'cargando' }); setIntento((n) => n + 1); }} />;
  }

  if (!ficha.tiene) {
    return (
      <EmptyState
        title="Llena tu ficha para recibir tu semana gratis"
        text="Con tu peso, estatura, edad y objetivo armamos un plan de 7 días de comidas y rutinas, sin costo."
        action={{ label: 'Llenar mi ficha', to: '/mi-panel?tab=ficha' }}
      />
    );
  }

  return (
    <section aria-labelledby="semana-titulo" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <p className="eyebrow">Tu semana gratis</p>
      <h2 id="semana-titulo" className="display mt-2 text-2xl text-navy-900">Genera tu plan de 7 días</h2>
      <p className="mt-3 max-w-xl text-slate-600">
        Tu ficha ya está lista. Cada día se abre cuando haces tu chequeo y marcas la mitad de tus ítems.
      </p>
      {error?.codigo === 'REQUIERE_NUTRICIONISTA' ? (
        <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">{error.mensaje}</p>
          <div className="mt-4">
            <LinkButton to="/mi-panel?tab=nutricionista" variant="blue">Pedir atención a una nutricionista</LinkButton>
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-700">{error.mensaje}</p>
        </div>
      ) : null}
      <div className="mt-6">
        <Button size="lg" onClick={() => void generar()} disabled={creando}>
          {creando ? 'Generando…' : 'Generar mi semana gratis'}
        </Button>
      </div>
    </section>
  );
}

interface SemanaActivaProps {
  trial: Trial;
  checkin: DailyCheckin | null;
  checkinError: string | null;
  onReintentarChequeo: () => void;
  onCheckinSaved: (checkin: DailyCheckin) => void;
  onToggle: (itemId: string, done: boolean) => Promise<void>;
}

/** Semana con plan: día actual, ítems, progreso, chequeo y aviso de lo que falta. */
function SemanaActiva({ trial, checkin, checkinError, onReintentarChequeo, onCheckinSaved, onToggle }: SemanaActivaProps) {
  const phase2 = usePhase(2);
  const ultimoAbierto = [...trial.days].reverse().find((d) => d.unlocked)?.day_number ?? 1;
  const numeroDia = trial.current_day ?? ultimoAbierto;
  const dia = trial.days.find((d) => d.day_number === numeroDia) ?? trial.days[0];
  const porcentaje = dia.items_total > 0 ? Math.round((dia.items_done / dia.items_total) * 100) : 0;
  const soloLectura = !dia.unlocked || dia.completed_at !== null;
  const factor = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(trial.portion_factor);

  return (
    <>
      <section aria-labelledby="hoy-titulo" className="rounded-[1.75rem] bg-navy-900 p-6 text-white shadow-xl shadow-navy-900/10 md:p-8">
        <p className="eyebrow !text-brand-blue">Hoy · {fechaLarga(trial.today)}</p>
        <h2 id="hoy-titulo" className="display mt-2 text-3xl md:text-4xl">
          {trial.finished ? '¡Semana completada!' : `Día ${numeroDia} de 7`}
        </h2>
        <p className="mt-3 text-base font-bold text-white">{trial.template_name}</p>
        <p className="mt-1 text-sm text-slate-300">≈ {trial.kcal_target} kcal · Porciones ×{factor}</p>
        {trial.template_status === 'borrador' ? (
          <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-amber-200">
            Plan de muestra pendiente de revisión por una nutricionista.
          </p>
        ) : null}
      </section>

      {trial.finished ? (
        <section aria-labelledby="fin-titulo" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
          <h2 id="fin-titulo" className="display text-2xl text-navy-900">¡Terminaste tus 7 días!</h2>
          <p className="mt-3 text-slate-600">
            {phase2
              ? 'Para seguir con tu plan, suscríbete. Una nutricionista tomará tu caso y armará tu agenda.'
              : 'Tu semana gratis llegó a su fin.'}
          </p>
          {phase2 ? (
            <div className="mt-5">
              <LinkButton to="/mi-plan/suscripcion" variant="primary">Suscribirme para seguir</LinkButton>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="dia-titulo" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="dia-titulo" className="display text-2xl text-navy-900">Día {dia.day_number}</h2>
          {dia.completed_at ? (
            <span className="inline-flex items-center gap-1 text-sm font-bold text-green-700">
              <Check aria-hidden="true" className="h-4 w-4" /> Día completado
            </span>
          ) : null}
        </div>

        {dia.unlocked ? (
          <>
            <div className="mt-4">
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Ítems marcados</span>
                <span>{dia.items_done} de {dia.items_total}</span>
              </div>
              <div
                role="progressbar"
                aria-label="Progreso del día"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={porcentaje}
                className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200"
              >
                <div className="h-full rounded-full bg-brand-orange transition-all" style={{ width: `${porcentaje}%` }} />
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {dia.items.map((item) => (
                <TrialItemRow
                  key={item.id}
                  item={item}
                  disabled={soloLectura}
                  onToggle={(done) => onToggle(item.id, done)}
                />
              ))}
            </ul>
            {dia.items.length === 0 ? <p className="mt-4 text-slate-600">Hoy no tienes ítems en este día.</p> : null}
          </>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-4 text-slate-600">
            <Lock aria-hidden="true" className="h-5 w-5 shrink-0" />
            <p className="font-semibold">Este día aún está cerrado.</p>
          </div>
        )}
      </section>

      {!trial.finished ? <AvisoAvance trial={trial} numeroDia={numeroDia} tieneChequeo={checkin !== null} /> : null}

      <section aria-labelledby="chequeo-titulo" className="space-y-3">
        <h2 id="chequeo-titulo" className="sr-only">Chequeo diario</h2>
        {checkinError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-bold text-red-700">{checkinError}</p>
            <Button variant="danger" onClick={onReintentarChequeo}>Reintentar</Button>
          </div>
        ) : null}
        <CheckinCard checkin={checkin} onSaved={onCheckinSaved} />
      </section>
    </>
  );
}

interface AvisoAvanceProps {
  trial: Trial;
  numeroDia: number;
  tieneChequeo: boolean;
}

/** Qué falta para abrir el día siguiente, o cuándo se abre. */
function AvisoAvance({ trial, numeroDia, tieneChequeo }: AvisoAvanceProps) {
  if (trial.current_day === null) {
    const siguiente = trial.days.find((d) => d.unlocked_on !== null && d.unlocked_on > trial.today);
    return (
      <section className="rounded-[1.75rem] border border-brand-blue/20 bg-white p-5 shadow-sm">
        <p className="font-bold text-navy-900">
          {siguiente && siguiente.unlocked_on
            ? `Vuelve mañana: tu Día ${siguiente.day_number} se abre el ${fechaLarga(siguiente.unlocked_on)}.`
            : 'Vuelve mañana para seguir con tu semana.'}
        </p>
      </section>
    );
  }

  const dia = trial.days.find((d) => d.day_number === numeroDia);
  if (!dia || numeroDia >= 7) return null;
  const minimo = Math.ceil(dia.items_total / 2);
  const marcados = dia.items_done >= minimo;

  if (marcados && tieneChequeo) {
    return (
      <section className="flex items-center gap-3 rounded-[1.75rem] border border-green-200 bg-green-50 p-5">
        <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-green-700" />
        <p className="font-bold text-green-900">¡Listo! El Día {numeroDia + 1} se abre mañana.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="falta-titulo" className="rounded-[1.75rem] border border-brand-blue/20 bg-white p-5 shadow-sm">
      <h2 id="falta-titulo" className="font-bold text-navy-900">Para abrir el Día {numeroDia + 1}</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        <li className="flex items-center gap-2">
          {tieneChequeo ? <Check aria-hidden="true" className="h-4 w-4 text-green-700" /> : <Circle aria-hidden="true" className="h-4 w-4 text-slate-400" />}
          <span>{tieneChequeo ? 'Chequeo de hoy hecho' : 'Haz tu chequeo de hoy'}</span>
        </li>
        <li className="flex items-center gap-2">
          {marcados ? <Check aria-hidden="true" className="h-4 w-4 text-green-700" /> : <Circle aria-hidden="true" className="h-4 w-4 text-slate-400" />}
          <span>Marca al menos {minimo} de {dia.items_total} ítems ({dia.items_done} marcados)</span>
        </li>
      </ul>
    </section>
  );
}
