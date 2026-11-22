import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { repo, type Review, type ReviewTarget } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import PhaseGate from '../PhaseGate';
import ConfirmDialog from '../profile/ConfirmDialog';
import { useAsync } from '../profile/useAsync';
import { formatDateLong } from '../profile/labels';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/Field';
import { ErrorState, Loading, errorMessage } from '../ui/States';
import { StarInput, Stars } from './Stars';

const COMENTARIO_MAX = 1000;
const NO_PERMITIDO = 'Solo puedes calificar a un nutricionista que te atendió.';
const CARD = 'rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8';

interface Props {
  target: ReviewTarget;
  targetId: string;
  canReview: boolean;
  title: string;
}

/** Promedio, lista y formulario de reseñas. Apagado mientras la fase 3 no esté encendida. */
export default function ReviewsSection(props: Props) {
  return (
    <PhaseGate phase={3} compact text="Las reseñas se habilitarán pronto.">
      <ReviewsBody {...props} />
    </PhaseGate>
  );
}

function ReviewsBody({ target, targetId, canReview, title }: Props) {
  const { session } = useAuth();
  const location = useLocation();
  const titleId = useId();
  const data = useAsync(async () => {
    const [rating, reviews] = await Promise.all([repo.getRating(target, targetId), repo.listReviews(target, targetId)]);
    return { rating, reviews };
  }, [target, targetId]);

  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [borrarError, setBorrarError] = useState<string | null>(null);

  const wrap = (children: ReactNode) => (
    <section aria-labelledby={titleId} className={CARD}>
      <h2 id={titleId} className="display text-2xl text-navy-900">{title}</h2>
      {children}
    </section>
  );

  if (data.status === 'loading') return wrap(<Loading text="Cargando reseñas…" />);
  if (data.status === 'error') return wrap(<ErrorState message={data.message} onRetry={data.reload} />);

  const { rating, reviews } = data.data;
  const mine = session ? reviews.find((r) => r.author_id === session.user.id) : undefined;

  const borrar = async () => {
    if (!mine) return;
    setBorrando(true);
    setBorrarError(null);
    try {
      await repo.deleteMyReview(mine.id);
      setConfirmBorrar(false);
      data.reload();
    } catch (e) {
      setBorrarError(errorMessage(e));
      setConfirmBorrar(false);
    } finally {
      setBorrando(false);
    }
  };

  return wrap(
    <>
      {rating.count > 0 && rating.average !== null ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Stars value={rating.average} />
          <p className="text-sm font-bold text-slate-600">
            {rating.count} {rating.count === 1 ? 'reseña' : 'reseñas'}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-slate-600">Todavía no hay reseñas.</p>
      )}

      {reviews.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {reviews.map((r) => <FilaReseña key={r.id} review={r} />)}
        </ul>
      ) : null}

      {!session && canReview ? (
        <p className="mt-6 text-slate-600">
          <Link
            to={`/ingresar?volver=${encodeURIComponent(location.pathname + location.search)}`}
            className="font-bold text-brand-blue"
          >
            Ingresa para dejar tu reseña
          </Link>
        </p>
      ) : null}

      {session && canReview ? (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="font-extrabold text-navy-900">{mine ? 'Tu reseña' : 'Deja tu reseña'}</h3>
          <ReviewForm
            key={mine?.id ?? 'nueva'}
            initial={mine}
            target={target}
            targetId={targetId}
            onSaved={data.reload}
          />
          {mine ? (
            <div className="mt-4">
              <Button variant="danger" onClick={() => setConfirmBorrar(true)} disabled={borrando}>
                Borrar mi reseña
              </Button>
              {borrarError ? <p role="alert" className="mt-3 font-bold text-red-700">{borrarError}</p> : null}
            </div>
          ) : null}
          {confirmBorrar && mine ? (
            <ConfirmDialog
              title="¿Borrar tu reseña?"
              text="Dejará de verse en la lista y el promedio se recalculará."
              confirmLabel="Sí, borrar"
              busy={borrando}
              onConfirm={borrar}
              onCancel={() => setConfirmBorrar(false)}
            />
          ) : null}
        </div>
      ) : null}
    </>,
  );
}

function FilaReseña({ review }: { review: Review }) {
  return (
    <li className="rounded-2xl bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-extrabold text-navy-900">{review.author_name ?? 'Usuario'}</p>
        <Stars value={review.stars} showNumber={false} />
      </div>
      {review.comment ? <p className="mt-2 text-slate-700">{review.comment}</p> : null}
      <p className="mt-2 text-xs text-slate-500">{formatDateLong(review.created_at.slice(0, 10))}</p>
    </li>
  );
}

/** El estado del formulario se inicializa desde `initial`; la página lo recrea con `key` cuando cambia la reseña. */
function ReviewForm({ initial, target, targetId, onSaved }: {
  initial?: Review;
  target: ReviewTarget;
  targetId: string;
  onSaved: () => void;
}) {
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (stars < 1) {
      setError('Elige de 1 a 5 estrellas.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const texto = comment.trim();
      await repo.saveReview({ target_type: target, target_id: targetId, stars, comment: texto ? texto : null });
      onSaved();
    } catch (err) {
      const code = (err as { code?: unknown } | null)?.code;
      setError(code === 'NO_PERMITIDO' ? NO_PERMITIDO : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={enviar} className="mt-4 space-y-5" noValidate>
      <StarInput value={stars} onChange={setStars} disabled={busy} />
      <TextArea
        label="Comentario (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={COMENTARIO_MAX}
        rows={4}
        hint={`${comment.length}/${COMENTARIO_MAX}`}
        disabled={busy}
      />
      {error ? <p role="alert" className="font-bold text-red-700">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar reseña'}
      </Button>
    </form>
  );
}
