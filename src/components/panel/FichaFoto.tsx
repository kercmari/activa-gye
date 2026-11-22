/** Campo de foto de cuerpo entero de «Mi ficha» (presentacional: el estado vive en FichaForm). */
import { CONSENTIMIENTO_FOTO } from './ficha';
import { Button } from '../ui/Button';

interface Props {
  /** URL de la foto que se muestra (nueva o guardada). null = sin foto. */
  preview: string | null;
  /** La foto guardada se está cargando. */
  loadingSaved: boolean;
  savedError: string | null;
  /** Error de la foto elegida (tipo o tamaño). */
  error: string | null;
  hasPhoto: boolean;
  consent: boolean;
  consentError?: string;
  /** Cambia para vaciar el input de archivo tras guardar. */
  fileKey: number;
  onFile: (file: File) => void;
  onRemove: () => void;
  onConsent: (checked: boolean) => void;
}

export default function FichaFoto({
  preview, loadingSaved, savedError, error, hasPhoto, consent, consentError, fileKey, onFile, onRemove, onConsent,
}: Props) {
  return (
    <section aria-labelledby="ficha-foto-titulo" className="rounded-2xl border border-slate-200 p-5">
      <h3 id="ficha-foto-titulo" className="eyebrow text-brand-orange">Foto de cuerpo entero (opcional)</h3>
      <p className="mt-2 text-sm text-slate-600">
        Ayuda a tu nutricionista a ver tu punto de partida. Solo la verán tú y tu nutricionista.
      </p>

      {loadingSaved ? <p role="status" className="mt-4 text-sm font-semibold text-slate-500">Cargando tu foto guardada…</p> : null}
      {savedError ? <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{savedError}</p> : null}

      {preview ? (
        <img
          src={preview}
          alt="Vista previa de tu foto de cuerpo entero"
          className="mt-4 max-h-80 rounded-2xl object-contain"
        />
      ) : null}

      <div className="mt-4">
        <label htmlFor="ficha-foto" className="mb-2 block text-sm font-bold text-navy-900">
          Elegir foto (JPG, PNG o WebP, máx. 5 MB)
        </label>
        <input
          key={fileKey}
          id="ficha-foto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-bold file:text-navy-900"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        {error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      </div>

      {hasPhoto ? (
        <div className="mt-4">
          <Button variant="ghost" onClick={onRemove}>Quitar foto</Button>
        </div>
      ) : null}

      {hasPhoto ? (
        <div className="mt-4">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-brand-orange"
              checked={consent}
              onChange={(e) => onConsent(e.target.checked)}
              aria-invalid={consentError ? true : undefined}
              aria-describedby={consentError ? 'ficha-consent-error' : undefined}
            />
            <span>{CONSENTIMIENTO_FOTO}</span>
          </label>
          {consentError ? <p id="ficha-consent-error" role="alert" className="mt-2 text-sm font-semibold text-red-600">{consentError}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
