import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'blue' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

interface Visual {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** true cuando el botón va sobre fondo oscuro (encabezado, portada). */
  onDark?: boolean;
  iconRight?: LucideIcon;
}

/** Clases del botón. Úsalas en enlaces con estilo de botón si hace falta. */
export function buttonClasses({ variant = 'primary', size = 'md', onDark = false }: Omit<Visual, 'iconRight'> = {}, extra = ''): string {
  const base = 'inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60';
  const sizes: Record<ButtonSize, string> = { md: 'px-5 py-3 text-sm', lg: 'px-7 py-4 text-base' };
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30 hover:bg-brand-orange-dark',
    blue: 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30 hover:bg-brand-blue-dark',
    secondary: onDark
      ? 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
      : 'border border-slate-300 bg-white text-navy-900 hover:bg-slate-50',
    ghost: onDark ? 'text-white hover:bg-white/10' : 'text-navy-900 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return [base, sizes[size], variants[variant], extra].filter(Boolean).join(' ');
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Visual;

/** Botón de acción (enviar, abrir, etc.). */
export function Button({ variant, size, onDark, iconRight: Icon, className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, onDark }, className)} {...rest}>
      {children}
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
    </button>
  );
}

export type LinkButtonProps = Omit<LinkProps, 'className'> & Visual & { className?: string; children?: ReactNode };

/** Botón que navega (enlace de react-router con aspecto de botón). */
export function LinkButton({ variant, size, onDark, iconRight: Icon, className = '', children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ variant, size, onDark }, className)} {...rest}>
      {children}
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}

export default Button;
