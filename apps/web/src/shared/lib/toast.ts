type ToastListener = (message: string) => void;

const listeners = new Set<ToastListener>();

export const NO_PERMISSION_MESSAGE = 'У вас нет прав для этого действия';

export function showToast(message: string): void {
  for (const listener of listeners) {
    listener(message);
  }
}

export function showNoPermissionToast(): void {
  showToast(NO_PERMISSION_MESSAGE);
}

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
