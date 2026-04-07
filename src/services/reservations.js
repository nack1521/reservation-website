import apiFetch from "./client.js";

const RES_BASE = import.meta.env.VITE_RESERVATIONS_BASE || "/reservations";

function pickList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.reservations)) return payload.reservations;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function pickDashboardPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      upcoming: [],
      pending: [],
      history: [],
      summary: {
        upcoming: 0,
        pending: 0,
        history: 0,
        total: 0,
      },
    };
  }

  const upcoming = pickList(payload.upcoming);
  const pending = pickList(payload.pending);
  const history = pickList(payload.history);

  const summaryRaw = payload.summary && typeof payload.summary === "object" ? payload.summary : {};

  return {
    upcoming,
    pending,
    history,
    summary: {
      upcoming: Number(summaryRaw.upcoming ?? upcoming.length),
      pending: Number(summaryRaw.pending ?? pending.length),
      history: Number(summaryRaw.history ?? history.length),
      total: Number(summaryRaw.total ?? upcoming.length + pending.length + history.length),
    },
  };
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value, fallback = null) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function hasRel(linkHeader = "", rel = "next") {
  const value = String(linkHeader || "");
  if (!value) return false;
  const pattern = new RegExp(`rel\\s*=\\s*"${rel}"`, "i");
  return pattern.test(value);
}

function pickPagedItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.reservations)) return payload.reservations;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function normalizePagedAdminResponse(raw = {}, params = {}) {
  const payload = raw?.data ?? raw;
  const headers = raw?.headers || {};
  const items = pickPagedItems(payload);
  const metaRaw = payload && typeof payload === "object" ? (payload.meta || payload.pagination || {}) : {};

  const page = toNumber(metaRaw.page ?? params.page ?? 1, 1);
  const limit = toNumber(metaRaw.limit ?? params.limit ?? 20, 20);
  const headerTotal = toNumber(headers.xTotalCount, NaN);
  const bodyTotal = toNumber(metaRaw.total ?? metaRaw.totalCount ?? metaRaw.totalItems, NaN);
  const total = Number.isFinite(bodyTotal) 
    ? bodyTotal 
    : Number.isFinite(headerTotal) 
    ? headerTotal 
    : items.length;
  const totalPages = toNumber(metaRaw.totalPages, Math.max(1, Math.ceil(total / Math.max(limit, 1))));
  const hasPrevPage =
    toBoolean(metaRaw.hasPrevPage) ??
    hasRel(headers.link || "", "prev") ??
    page > 1;
  const hasNextPage =
    toBoolean(metaRaw.hasNextPage) ??
    hasRel(headers.link || "", "next") ??
    page < totalPages;

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasPrevPage,
      hasNextPage,
    },
    headers: {
      xTotalCount: headers.xTotalCount || "",
      link: headers.link || "",
    },
  };
}

export const reservationsAPI = {
  availability: (roomId, date) =>
    apiFetch(`${RES_BASE}/availability${buildQuery({ room: roomId, date })}`, {
      withCredentials: true,
    }),

  create: (payload) =>
    apiFetch(RES_BASE, {
      method: "POST",
      withCredentials: true,
      body: JSON.stringify(payload),
    }),

  update: (id, payload) =>
    apiFetch(`${RES_BASE}/${id}`, {
      method: "PATCH",
      withCredentials: true,
      body: JSON.stringify(payload),
    }),

  cancel: (id) =>
    apiFetch(`${RES_BASE}/${id}/cancel`, {
      method: "PATCH",
      withCredentials: true,
      auth: true,
    }),

  remove: (id) =>
    apiFetch(`${RES_BASE}/${id}`, {
      method: "DELETE",
      withCredentials: true,
    }),

  list: async (params = {}) => {
    const response = await apiFetch(`${RES_BASE}${buildQuery(params)}`, {
      withCredentials: true,
      auth: true,
    });
    return pickList(response);
  },

  me: async (params = {}) => {
    const response = await apiFetch(`${RES_BASE}/me${buildQuery(params)}`, {
      withCredentials: true,
      auth: true,
    });
    return pickList(response);
  },

  user: async (userId, params = {}) => {
    const response = await apiFetch(`${RES_BASE}/user/${userId}${buildQuery(params)}`, {
      withCredentials: true,
      auth: true,
    });
    return pickList(response);
  },

  meDashboard: async () => {
    const response = await apiFetch(`${RES_BASE}/me/dashboard`, {
      withCredentials: true,
      auth: true,
    });
    return pickDashboardPayload(response);
  },

  pending: async () => {
    const response = await apiFetch(`${RES_BASE}/pending`, {
      withCredentials: true,
    });
    return pickList(response);
  },

  adminAll: async (params = {}) => {
    const response = await apiFetch(`${RES_BASE}/all${buildQuery(params)}`, {
      withCredentials: true,
      includeResponseMeta: true,
    });
    return normalizePagedAdminResponse(response, params);
  },

  approve: (id, note = "approved") =>
    apiFetch(`${RES_BASE}/${id}/approve`, {
      method: "PATCH",
      withCredentials: true,
      body: JSON.stringify({ note }),
    }),

  reject: (id, note = "rejected") =>
    apiFetch(`${RES_BASE}/${id}/reject`, {
      method: "PATCH",
      withCredentials: true,
      body: JSON.stringify({ note }),
    }),
};
