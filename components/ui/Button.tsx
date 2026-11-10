import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'sk-press bg-primary text-on-primary hover:bg-primary-press active:bg-primary-press',
  secondary: 'bg-surface text-ink border border-line hover:border-muted',
  ghost: 'bg-transparent text-ink hover:bg-primary-soft',
};

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 text-base', // 44px touch target
  lg: 'min-h-13 px-5 text-lg',
};

type StyleOptions = { variant?: Variant; size?: Size; fullWidth?: boolean; className?: string };

/** Button styling, usable on links too (<Link className={buttonClass(...)}>). */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: StyleOptions = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-semibold',
    'transition-[transform,translate,box-shadow,background-color,border-color] duration-(--dur-tap) ease-(--ease-out)',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Omit<StyleOptions, 'className'>;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
