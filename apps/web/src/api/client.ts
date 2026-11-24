import type { ZodType } from 'zod';

/** `status` fica indefinido quando a requisição nem chegou ao servidor (offline, timeout). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const OFFLINE_MESSAGE = 'Sem conexão com o servidor. Tente novamente.';
const REQUEST_TIMEOUT_MS = 10_000;

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void): void => {
  unauthorizedHandler = handler;
};

function messageFrom(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body;
    if (typeof message === 'string') return message;
  }
  return 'Não foi possível concluir a operação.';
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  schema: ZodType<T>,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE);
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') unauthorizedHandler?.();
    throw new ApiError(messageFrom(payload), response.status);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ApiError('Resposta inesperada do servidor.', response.status);
  return parsed.data;
}
