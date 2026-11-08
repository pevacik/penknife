import { useEffect, useRef, useState } from 'react';
import { AUTH_FORBIDDEN_EVENT } from '@/shared/api/httpClient';
import { showNoPermissionToast, subscribeToast } from '@/shared/lib/toast';
import styles from './ToastHost.module.css';

const TOAST_DURATION = 3200;

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = subscribeToast((nextMessage) => {
      setMessage(nextMessage);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMessage(null), TOAST_DURATION);
    });

    const handleForbidden = () => {
      showNoPermissionToast();
    };
    window.addEventListener(AUTH_FORBIDDEN_EVENT, handleForbidden);

    return () => {
      unsubscribe();
      window.removeEventListener(AUTH_FORBIDDEN_EVENT, handleForbidden);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {message}
    </div>
  );
}
