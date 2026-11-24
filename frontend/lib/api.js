export function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return "http://localhost:8000";
}

export async function parseApiError(response) {
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

export async function apiRequest(path, options = {}) {
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
