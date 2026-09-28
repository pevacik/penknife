import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...rest }: SelectProps) {
  const classes = className ? `${styles.select} ${className}` : styles.select;

  return (
    <select className={classes} {...rest}>
      {children}
    </select>
  );
}
