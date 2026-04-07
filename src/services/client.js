import { getApiBaseUrl } from "./config.js";

const API_BASE = getApiBaseUrl();

function readAccessToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

async function parseSuccessBody(response) {
  if (response.status === 204) return {};

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return await response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => "");
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const {
    auth = false,
    withCredentials = false,
    headers: incomingHeaders = {},
    ...rest
  } = options;

  const headers = {
    ...incomingHeaders,
  };

  if (auth && !headers.Authorization) {
    const token = readAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const hasBody = rest.body !== undefined && rest.body !== null;
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
  if (hasBody && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    credentials: withCredentials ? "include" : "omit",
    headers,
    ...rest,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:expired", {
            detail: { endpoint, status: response.status },
          })
        );
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await parseSuccessBody(response);
  } catch (error) {
    console.error("API Error:", error);
    if (error?.message === "Failed to fetch") {
      throw new Error(`Failed to fetch (${url}). Check API URL/CORS/backend status.`);
    }
    throw error;
  }
}

export default apiFetch;