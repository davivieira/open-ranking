export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiClientOptions {
  token?: string | null;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: ApiClientOptions,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const rawText = await response.text();
    let message = `Request failed with status ${response.status}`;

    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed.detail) && parsed.detail[0]?.msg) {
          message = parsed.detail[0].msg as string;
        } else if (typeof parsed.detail === "string") {
          message = parsed.detail;
        } else {
          message = rawText;
        }
      } catch {
        message = rawText;
      }
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiClientOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: ApiClientOptions) =>
    request<T>("DELETE", path, undefined, options),
};

