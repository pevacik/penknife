import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'danger' | 'ghost';

const variantClass: Record<ButtonVariant, string> = {
  primary: styles.primary,
  danger: styles.danger,
  ghost: styles.ghost,
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Кнопка видима, но действие недоступно по правам. */
  inactive?: boolean;
}

export function Button({
  children,
  className,
  variant = 'primary',
  inactive = false,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, variantClass[variant], className, inactive ? styles.inactive : null]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-disabled={inactive || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}


