export interface HttpError extends Error {
  status: number;
}

/** Ошибка с HTTP-статусом: её подхватывает error-middleware в `app.ts`. */
export function httpError(message: string, status = 400): HttpError {
  return Object.assign(new Error(message), { status });
}
