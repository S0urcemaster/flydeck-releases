import type { ApiError } from "@flydeck/shared/data";

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error("Backend is not reachable");
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error(`Backend returned HTTP ${response.status} without data. Please restart the backend.`);
  }

  let body: T | ApiError;
  try {
    body = JSON.parse(responseText) as T | ApiError;
  } catch {
    throw new Error(`Backend returned HTTP ${response.status} without JSON. Please restart the backend.`);
  }

  if (!response.ok) {
    const error = body as ApiError;
    throw new Error(error.message || `Backend returned HTTP ${response.status}`);
  }
  return body as T;
}
