import apiFetch from "./client.js";

const USERS_BASE = import.meta.env.VITE_USERS_BASE || "/users";
const USERS_BASE_CANDIDATES = Array.from(new Set([USERS_BASE, "/users", "/user"]));

function pickUsers(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function isNotFoundError(err) {
  return /404|not found/i.test(String(err?.message || ""));
}

function normalizeUserId(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  const direct = value.id || value._id || value.userId || value.$oid || value.oid;
  if (typeof direct === "string") return direct.trim();

  if (direct && typeof direct === "object") {
    const nested = direct.$oid || direct.oid || direct.id || direct._id;
    if (typeof nested === "string") return nested.trim();
  }

  return "";
}

function buildUserActionPath(rawId, actionSuffix) {
  const userId = normalizeUserId(rawId);
  if (!userId) {
    throw new Error("Invalid user id for teacher/admin action.");
  }
  return `/${encodeURIComponent(userId)}${actionSuffix}`;
}

async function fetchUsersWithFallback(pathSuffix, options) {
  let lastError = null;

  for (const base of USERS_BASE_CANDIDATES) {
    const endpoint = `${base}${pathSuffix}`;
    console.debug("[usersAPI] trying endpoint:", endpoint);
    try {
      const response = await apiFetch(endpoint, options);
      console.debug("[usersAPI] success endpoint:", endpoint);
      return response;
    } catch (err) {
      lastError = err;
      console.warn("[usersAPI] failed endpoint:", endpoint, "message:", err?.message || err);
      if (!isNotFoundError(err)) throw err;
    }
  }

  console.error("[usersAPI] all endpoint candidates failed for:", pathSuffix, lastError);
  throw lastError || new Error("Users endpoint not found.");
}

export const usersAPI = {
  register: ({ email, password, name }) =>
    fetchUsersWithFallback(`/register`, {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  requestTeacherRole: () =>
    fetchUsersWithFallback(`/me/request-teacher`, {
      method: "POST",
      withCredentials: true,
      auth: true,
    }),

  updateMe: (payload) =>
    fetchUsersWithFallback(`/me`, {
      method: "PATCH",
      withCredentials: true,
      auth: true,
      body: JSON.stringify(payload),
    }),

  teacherRequests: async () => {
    const response = await fetchUsersWithFallback(`/teacher-requests`, {
      withCredentials: true,
      auth: true,
    });
    return pickUsers(response);
  },

  approveTeacher: (id) =>
    fetchUsersWithFallback(buildUserActionPath(id, "/approve-teacher"), {
      method: "PATCH",
      withCredentials: true,
      auth: true,
    }),

  rejectTeacher: (id) =>
    fetchUsersWithFallback(buildUserActionPath(id, "/reject-teacher"), {
      method: "PATCH",
      withCredentials: true,
      auth: true,
    }),

  grantAdmin: (id) =>
    fetchUsersWithFallback(buildUserActionPath(id, "/grant-admin"), {
      method: "PATCH",
      withCredentials: true,
      auth: true,
    }),
};
