import { API_URL } from "./constants";

export interface RegisteredUser {
  id: string;
  email: string;
  password: string;
  name: string;
  cookie: string;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

/**
 * Specs run in parallel against one shared e2e database (not per-test
 * isolated like the backend's in-memory Mongo), so any provider whose name
 * gets matched via a UI list/search needs to be distinguishable from
 * whatever other specs are creating providers at the same moment.
 */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function extractSessionCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Expected a Set-Cookie header on the response");
  }
  return setCookie.split(";")[0];
}

/**
 * Registers a user directly against the API. Used for test *setup* (getting
 * accounts into existence quickly) — the actual register/login UI flow is
 * exercised for real in auth.spec.ts, not bypassed everywhere.
 */
export async function registerViaApi(
  role: "customer" | "provider",
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<RegisteredUser> {
  const email = overrides.email ?? uniqueEmail(role);
  const password = overrides.password ?? "supersecret1";
  const name = overrides.name ?? (role === "provider" ? "Test Provider" : "Test Customer");

  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  if (!res.ok) {
    throw new Error(`Failed to register ${role} via API: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { user: { id: string } };
  return { id: body.user.id, email, password, name, cookie: extractSessionCookie(res) };
}

export async function setProviderWorkingHours(
  provider: RegisteredUser,
  options: { dayOfWeek: number | number[]; startTime?: string; endTime?: string; bufferMinutes?: number },
): Promise<void> {
  const days = Array.isArray(options.dayOfWeek) ? options.dayOfWeek : [options.dayOfWeek];
  const res = await fetch(`${API_URL}/providers/me/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: provider.cookie },
    body: JSON.stringify({
      bufferMinutes: options.bufferMinutes ?? 15,
      workingHours: days.map((dayOfWeek) => ({
        dayOfWeek,
        startTime: options.startTime ?? "00:00",
        endTime: options.endTime ?? "23:45",
      })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to set provider working hours: ${res.status} ${await res.text()}`);
  }
}

export interface CreatedService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export async function createServiceViaApi(
  provider: RegisteredUser,
  options: { name?: string; durationMinutes?: number; price?: number } = {},
): Promise<CreatedService> {
  const res = await fetch(`${API_URL}/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: provider.cookie },
    body: JSON.stringify({
      name: options.name ?? "Consultation",
      durationMinutes: options.durationMinutes ?? 30,
      price: options.price ?? 50,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create service: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    service: { _id: string; name: string; durationMinutes: number; price: number };
  };
  return {
    id: body.service._id,
    name: body.service.name,
    durationMinutes: body.service.durationMinutes,
    price: body.service.price,
  };
}

/** Convenience: register a provider and give them wide-open hours + one service in a single call. */
export async function setupProviderWithService(options: {
  dayOfWeek: number | number[];
  startTime?: string;
  endTime?: string;
  providerName?: string;
  serviceName?: string;
  durationMinutes?: number;
  price?: number;
}): Promise<{ provider: RegisteredUser; service: CreatedService }> {
  const provider = await registerViaApi("provider", { name: options.providerName });
  await setProviderWorkingHours(provider, options);
  const service = await createServiceViaApi(provider, {
    name: options.serviceName,
    durationMinutes: options.durationMinutes,
    price: options.price,
  });
  return { provider, service };
}
