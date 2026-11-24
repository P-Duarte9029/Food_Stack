import type { ZodType } from 'zod';

export class ApiError extends Error {}

const OFFLINE_MESSAGE = 'Sem conexão com o servidor. Tente novamente.';

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
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE);
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') unauthorizedHandler?.();
    throw new ApiError(messageFrom(payload));
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ApiError('Resposta inesperada do servidor.');
  return parsed.data;
}
