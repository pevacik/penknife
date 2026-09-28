import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'danger';
}

export function Button({ children, className, variant = 'primary', ...rest }: ButtonProps) {
  const classes = [styles.button, variant === 'danger' ? styles.danger : styles.primary, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

