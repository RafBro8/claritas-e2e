const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:4001/api";
// Origin only (no /api suffix), for building plain <a href> links to
// statically-served assets like archived reports, outside of apiRequest.
export const API_ORIGIN: string = API_BASE_URL.replace(/\/api\/?$/, "");

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Something went wrong");
  }

  return data as T;
}

export interface HealthResponse {
  status: string;
  db: "connected" | "disconnected";
  timestamp: string;
}

export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}
