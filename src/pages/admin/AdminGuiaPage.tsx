import { useState } from 'react';
import { repo, type GuideEntry } from '../../data';
import AdminShell from '../../components/admin/AdminShell';
import { useAsync } from '../../components/profile/useAsync';
import ConfirmDialog from '../../components/profile/ConfirmDialog';
import Badge from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';
import GuideEditor from '../../components/guide/GuideEditor';
import { CATEGORY_LABELS } from '../../components/guide/guideModel';

const NO_ENTRIES: GuideEntry[] = [];

type Mode = { kind: 'list' } | { kind: 'edit'; entry: GuideEntry | null };

/** Editor de la guía para nutricionista y admin: lista, crear, editar y borrar. */
export default function AdminGuiaPage() {
  const list = useAsync(() => repo.adminListGuide());
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [notice, setNotice] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<GuideEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const entries = list.status === 'ok' ? list.data : NO_ENTRIES;
  const suggestedSort = entries.reduce((max, e) => Math.max(max, e.sort), 0) + 10;

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await repo.adminDeleteGuideEntry(toDelete.id);
      setToDelete(null);
      setNotice(`Se borró «${toDelete.title}».`);
      list.reload();
    } catch (error) {
      setDeleteError(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminShell title="Editar la guía">
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-slate-600">Las entradas publicadas se muestran en la guía pública.</p>
          </div>
          {mode.kind === 'list' && list.status === 'ok' ? (
            <Button variant="primary" onClick={() => { setNotice(null); setMode({ kind: 'edit', entry: null }); }}>
              Nueva entrada
            </Button>
          ) : null}
        </header>

        {notice ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800">{notice}</p> : null}

        {mode.kind === 'edit' ? (
          <GuideEditor
            key={mode.entry?.id ?? 'nueva'}
            entry={mode.entry}
            suggestedSort={suggestedSort}
            onCancel={() => setMode({ kind: 'list' })}
            onSaved={(saved) => {
              setMode({ kind: 'list' });
              setNotice(`Se guardó «${saved.title}».`);
              list.reload();
            }}
          />
        ) : null}

        {mode.kind === 'list' && list.status === 'loading' ? <Loading text="Cargando las entradas…" /> : null}

        {mode.kind === 'list' && list.status === 'error' ? (
          <ErrorState message={list.message} onRetry={list.reload} />
        ) : null}

        {mode.kind === 'list' && list.status === 'ok' && entries.length === 0 ? (
          <EmptyState
            title="Aún no hay entradas"
            text="Crea la primera entrada para que aparezca en la guía."
            action={{ label: 'Crear la primera entrada', onClick: () => setMode({ kind: 'edit', entry: null }) }}
          />
        ) : null}

        {mode.kind === 'list' && list.status === 'ok' && entries.length > 0 ? (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-white p-5 shadow-xl shadow-navy-900/5">
                <div className="min-w-0">
                  <p className="font-extrabold text-navy-900">{entry.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {CATEGORY_LABELS[entry.category]} · orden {entry.sort} · {entry.slug}
                  </p>
                  <div className="mt-2">
                    {entry.published ? <Badge tone="green">Publicada</Badge> : <Badge tone="slate">No publicada</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="md" onClick={() => { setNotice(null); setMode({ kind: 'edit', entry }); }}>
                    Editar
                  </Button>
                  <Button variant="danger" size="md" onClick={() => { setNotice(null); setDeleteError(null); setToDelete(entry); }}>
                    Borrar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {deleteError ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700">{deleteError}</p> : null}

        {toDelete ? (
          <ConfirmDialog
            title="¿Borrar esta entrada?"
            text={`«${toDelete.title}» dejará de verse en la guía. Esta acción no se puede deshacer.`}
            confirmLabel="Sí, borrar"
            busy={deleting}
            onConfirm={confirmDelete}
            onCancel={() => setToDelete(null)}
          />
        ) : null}
      </div>
    </AdminShell>
  );
}
