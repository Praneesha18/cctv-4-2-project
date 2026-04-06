import { clearAuthSession, getAuthToken, setSessionNotice } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL !== undefined
    ? import.meta.env.VITE_BACKEND_URL
    : "http://localhost:3000";

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (response.status === 401) {
    clearAuthSession();
    setSessionNotice("Your session expired. Please log in again to continue.");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:session-expired"));

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    throw new Error(data.message || "Session expired");
  }

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function buildAuthorizedMediaUrl(path) {
  const token = getAuthToken();
  if (!token) {
    return `${API_BASE_URL}${path}`;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${API_BASE_URL}${path}${separator}token=${encodeURIComponent(token)}`;
}

export { API_BASE_URL };
