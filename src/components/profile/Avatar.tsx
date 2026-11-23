import { useAvatarUrl } from './useAvatarUrl';

export type AvatarSize = 'sm' | 'md' | 'xl';

const SIZES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  xl: 'h-20 w-20 text-4xl',
};

interface Props {
  /** Ruta de la foto en el bucket `avatars` (profile.avatar_path). */
  path: string | null | undefined;
  /** Nombre de la persona: su inicial se usa si no hay foto. */
  name: string;
  size?: AvatarSize;
  className?: string;
}

/** Foto de perfil redonda; sin foto (o si no carga) muestra la inicial del nombre. */
export default function Avatar({ path, name, size = 'md', className = '' }: Props) {
  const url = useAvatarUrl(path);
  const inicial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue font-extrabold text-white ${SIZES[size]} ${className}`}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : inicial}
    </span>
  );
}
