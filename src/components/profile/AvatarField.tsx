import { useEffect, useId, useMemo, useState } from 'react';
import { validarFoto } from './fotoValidation';

interface Props {
  /** Foto guardada (URL firmada) o null si no hay. */
  savedUrl: string | null;
  /** Foto elegida y válida, todavía no guardada. */
  value: File | null;
  /** Recibe la foto válida, o null al quitar la elección. */
  onChange: (file: File | null) => void;
  /** Error de la foto (debajo del campo). */
  error?: string | null;
  /** Texto del botón de elegir: «Elegir foto» o «Cambiar foto». */
  label?: string;
  disabled?: boolean;
}

/** Campo de foto de perfil: vista previa, elegir o cambiar y error en su campo. Valida el tipo y el tamaño. */
export default function AvatarField({ savedUrl, value, onChange, error, label = 'Elegir foto', disabled = false }: Props) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [localError, setLocalError] = useState<string | null>(null);
  const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const mostrada = preview ?? savedUrl;
  const mensaje = error ?? localError;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
        {mostrada ? (
          <img src={mostrada} alt="Vista previa de tu foto de perfil" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs font-bold text-slate-500">Sin foto</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="mb-2 block text-sm font-bold text-navy-900">
          {label} (JPG, PNG o WebP, máx. 5 MB)
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          aria-invalid={mensaje ? true : undefined}
          aria-describedby={mensaje ? errorId : undefined}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-bold file:text-navy-900 disabled:opacity-60"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const malo = validarFoto(file);
            setLocalError(malo);
            onChange(malo ? null : file);
          }}
        />
        {mensaje ? (
          <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-red-600">{mensaje}</p>
        ) : null}
      </div>
    </div>
  );
}
