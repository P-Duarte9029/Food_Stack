import { healthResponseSchema, type HealthResponse } from '@food-stack/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) throw new Error(`API respondeu ${response.status}`);
  return healthResponseSchema.parse(await response.json());
}
