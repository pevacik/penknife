import type { TextareaHTMLAttributes } from 'react';
import styles from './Textarea.module.css';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...rest }: TextareaProps) {
  const classes = className ? `${styles.textarea} ${className}` : styles.textarea;

  return <textarea className={classes} {...rest} />;
}
