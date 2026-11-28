/*
 * Shared API helpers for the patient portal and the admin dashboard.
 *
 * - getApiBaseUrl / parseApiError / apiRequest: used by the patient
 *   portal (plain JS, returns the raw Response).
 * - RequestError / apiFetch / api: used by the admin dashboard
 *   (typed, throws on non-2xx responses).
 */

export function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }

  return "http://localhost:8000";
}

export const API_BASE = getApiBaseUrl();

export type ApiError = {
  status: number;
  message: string;
};

export class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const detail = data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || item?.message)
        .filter(Boolean)
        .join(". ");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {
    // Fall through to generic message
  }

  return "Request failed. Please try again.";
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((item: { msg?: string; message?: string }) => item.msg || item.message || "")
        .filter(Boolean)
        .join(". ");
    }
    if (typeof data?.message === "string") return data.message;
  } catch {
    // ignore body parse failures
  }
  return `Request failed (${response.status}). Please try again.`;
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("session_id");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });

  return response;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new RequestError(response.status, await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, form: FormData): Promise<T> => {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!response.ok) {
      throw new RequestError(response.status, await parseError(response));
    }
    return (await response.json()) as T;
  },
};
