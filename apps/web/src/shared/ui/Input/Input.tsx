import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  const classes = className ? `${styles.input} ${className}` : styles.input;

  return <input className={classes} {...rest} />;
}
