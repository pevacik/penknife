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
}

export function Button({ children, className, variant = 'primary', ...rest }: ButtonProps) {
  const classes = [styles.button, variantClass[variant], className].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}


