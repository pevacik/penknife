import { API_URL } from '@/shared/config/env';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';
export const AUTH_FORBIDDEN_EVENT = 'auth:forbidden';

function notifyAuthIssue(response: Response): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  } else if (response.status === 403) {
    window.dispatchEvent(new Event(AUTH_FORBIDDEN_EVENT));
  }
}

export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

async function toHttpError(response: Response): Promise<HttpError> {
  let message = `HTTP ${response.status}: ${response.statusText}`;

  try {
    const data = (await response.clone().json()) as { message?: unknown };
    if (typeof data.message === 'string' && data.message.trim()) {
      message = data.message;
    }
  } catch {
    // Тело не JSON — оставляем стандартный текст.
  }

  return new HttpError(message, response.status);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...init });

  if (!response.ok) {
    notifyAuthIssue(response);
    throw await toHttpError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...init });

  if (!response.ok) {
    notifyAuthIssue(response);
    throw await toHttpError(response);
  }

  return response.blob();
}

export const httpClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { headers: JSON_HEADERS });
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
  upload<T>(path: string, body: FormData): Promise<T> {
    return request<T>(path, { method: 'POST', body });
  },
  postBlob(path: string, body?: unknown): Promise<Blob> {
    return requestBlob(path, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
};

